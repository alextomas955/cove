using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Cove.Api.OpenApi;

/// <summary>
/// Relaxes the required set on schemas that are only ever consumed as request bodies, keeping the
/// members the server genuinely mandates required while dropping those the caller may omit.
///
/// <see cref="ContractSchemaTransformer"/> marks a member required whenever it is non-nullable and
/// carries no schema default — the correct rule for a <b>response</b>, which the server always emits
/// in full. A <b>request</b> body is authored by the caller, and some non-nullable members still have
/// a server-side default the schema does not surface: value-type inputs (a bool flag, a numeric page
/// size) deserialize to their CLR default when omitted, and members declared with a property
/// initializer (e.g. a filter's <c>Page = 1</c> or an empty criteria list) carry a default that is
/// never emitted onto the schema. Forcing callers to supply those would misrepresent the contract in
/// the opposite direction — claiming values are mandatory that the API actually defaults.
///
/// The schema transformer already identified, per schema, the members a request genuinely mandates
/// (non-nullable, no-default, reference-typed constructor parameters — a create's name, an id list, a
/// nested request object) and recorded them in <see cref="RequestRequiredMembers"/>. For a
/// request-only schema this transformer intersects the required set with that recorded set, so every
/// optional-on-input member is relaxed and the mandatory ones stay required.
///
/// A schema is treated as request-only when it is reachable from at least one operation's request
/// body and from no operation's response. Shapes shared with responses are left strict.
/// </summary>
internal sealed class RequestSchemaRelaxationTransformer(RequestRequiredMembers requestRequired)
    : IOpenApiDocumentTransformer
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
                var keep = requestRequired.TryGet(concrete, out var inputRequired)
                    ? inputRequired
                    : (IReadOnlySet<string>)new HashSet<string>();

                var relaxable = concrete.Required
                    .Where(name => !keep.Contains(name))
                    .ToList();

                foreach (var name in relaxable)
                    concrete.Required.Remove(name);
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
