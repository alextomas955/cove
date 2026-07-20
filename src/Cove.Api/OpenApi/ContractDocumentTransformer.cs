using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Cove.Api.OpenApi;

/// <summary>
/// Completes the optional-not-null modelling started by <see cref="ContractSchemaTransformer"/>.
/// A nullable reference member (e.g. a nullable enum or nested object) is emitted by the framework
/// as a union with the null type — <c>oneOf: [ { type: null }, { $ref } ]</c> — and that union is
/// assembled after schema transformers run, so it cannot be adjusted there. This document transformer
/// walks the finished document and drops the explicit null branch from every such union, leaving the
/// referenced type. Absence is still conveyed by the property being optional, keeping the contract's
/// "omit, don't null" convention consistent across primitive and reference members.
/// </summary>
internal sealed class ContractDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var schemas = document.Components?.Schemas;
        if (schemas is null)
            return Task.CompletedTask;

        var visited = new HashSet<IOpenApiSchema>(ReferenceEqualityComparer.Instance);
        foreach (var schema in schemas.Values)
            StripNullBranches(schema, visited);

        return Task.CompletedTask;
    }

    private static void StripNullBranches(IOpenApiSchema? schema, HashSet<IOpenApiSchema> visited)
    {
        if (schema is not OpenApiSchema concrete || !visited.Add(concrete))
            return;

        RemoveNullBranches(concrete.OneOf);
        RemoveNullBranches(concrete.AnyOf);

        if (concrete.Properties is { Count: > 0 })
        {
            foreach (var child in concrete.Properties.Values)
                StripNullBranches(child, visited);
        }

        StripNullBranches(concrete.Items, visited);
        StripNullBranches(concrete.AdditionalProperties, visited);
        StripNullBranchesAll(concrete.OneOf, visited);
        StripNullBranchesAll(concrete.AnyOf, visited);
        StripNullBranchesAll(concrete.AllOf, visited);
    }

    private static void RemoveNullBranches(IList<IOpenApiSchema>? members)
    {
        if (members is not { Count: > 1 })
            return;

        for (var i = members.Count - 1; i >= 0 && members.Count > 1; i--)
        {
            if (members[i] is OpenApiSchema { Type: JsonSchemaType.Null } inline
                && IsNullOnly(inline))
            {
                members.RemoveAt(i);
            }
        }
    }

    // Only remove a branch that is purely the null type (no other constraints), so a meaningful
    // nullable-typed subschema is never discarded.
    private static bool IsNullOnly(OpenApiSchema schema) =>
        schema.Type == JsonSchemaType.Null
        && (schema.OneOf is null || schema.OneOf.Count == 0)
        && (schema.AnyOf is null || schema.AnyOf.Count == 0)
        && (schema.AllOf is null || schema.AllOf.Count == 0)
        && (schema.Properties is null || schema.Properties.Count == 0);

    private static void StripNullBranchesAll(IList<IOpenApiSchema>? members, HashSet<IOpenApiSchema> visited)
    {
        if (members is null)
            return;

        foreach (var member in members)
            StripNullBranches(member, visited);
    }
}
