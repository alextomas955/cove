using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Cove.Api.OpenApi;

/// <summary>
/// Relaxes the required set on schemas that are only ever consumed as request bodies. Response
/// shapes are always emitted in full, so their non-nullable members are genuinely required; request
/// shapes, however, are authored by the caller, who may send only the fields being changed and let
/// the server apply defaults (an omitted flag, an unset filter, an unspecified update mode). Marking
/// such members required would force callers to supply values the API does not actually demand.
///
/// A schema is treated as request-only when it is reachable from at least one operation's request
/// body and from no operation's response. Its required set is cleared so every member is optional;
/// shapes shared with responses are left strict.
/// </summary>
internal sealed class RequestSchemaRelaxationTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var schemas = document.Components?.Schemas;
        if (schemas is null || document.Paths is null)
            return Task.CompletedTask;

        var requestReachable = new HashSet<IOpenApiSchema>(ReferenceEqualityComparer.Instance);
        var responseReachable = new HashSet<IOpenApiSchema>(ReferenceEqualityComparer.Instance);

        foreach (var pathItem in document.Paths.Values)
        {
            if (pathItem.Operations is null)
                continue;

            foreach (var operation in pathItem.Operations.Values)
            {
                if (operation.RequestBody?.Content is { } requestContent)
                {
                    foreach (var media in requestContent.Values)
                        Collect(media.Schema, requestReachable);
                }

                if (operation.Responses is null)
                    continue;

                foreach (var response in operation.Responses.Values)
                {
                    if (response.Content is not { } responseContent)
                        continue;

                    foreach (var media in responseContent.Values)
                        Collect(media.Schema, responseReachable);
                }
            }
        }

        foreach (var schema in schemas.Values)
        {
            if (schema is OpenApiSchema concrete
                && concrete.Required is { Count: > 0 }
                && requestReachable.Contains(concrete)
                && !responseReachable.Contains(concrete))
            {
                concrete.Required.Clear();
            }
        }

        return Task.CompletedTask;
    }

    private static void Collect(IOpenApiSchema? schema, HashSet<IOpenApiSchema> reachable)
    {
        switch (schema)
        {
            case OpenApiSchemaReference reference:
                Collect(reference.Target, reachable);
                return;

            case OpenApiSchema concrete:
                if (!reachable.Add(concrete))
                    return;

                if (concrete.Properties is { Count: > 0 })
                {
                    foreach (var child in concrete.Properties.Values)
                        Collect(child, reachable);
                }

                Collect(concrete.Items, reachable);
                Collect(concrete.AdditionalProperties, reachable);
                CollectAll(concrete.AllOf, reachable);
                CollectAll(concrete.AnyOf, reachable);
                CollectAll(concrete.OneOf, reachable);
                return;
        }
    }

    private static void CollectAll(IList<IOpenApiSchema>? members, HashSet<IOpenApiSchema> reachable)
    {
        if (members is null)
            return;

        foreach (var member in members)
            Collect(member, reachable);
    }
}
