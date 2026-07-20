using System.Reflection;
using System.Text.Json.Serialization.Metadata;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Cove.Api.OpenApi;

/// <summary>
/// Aligns the emitted OpenAPI schema with the server's actual wire contract so that generated
/// clients match the shapes the API really produces and accepts. Three adjustments are applied,
/// all sourced from the CLR type metadata (nullable-reference annotations and value-type nullability)
/// rather than from any hand-maintained list:
/// <list type="bullet">
///   <item><description><b>Required members.</b> A property is marked required when its member is
///   non-nullable and carries no schema default. This reflects that the serializer always writes
///   such members and that nullable / defaulted members are genuinely optional on the wire.</description></item>
///   <item><description><b>Nullability.</b> The JSON <c>null</c> type is stripped from members the CLR
///   reports as non-nullable and added to members it reports as nullable, keeping the two directions in
///   sync with the C# declarations.</description></item>
///   <item><description><b>Numeric read tolerance.</b> Numeric members accept a string form on read
///   (a lenient input convenience), which surfaces as an <c>["integer","string"]</c> union plus a
///   validation pattern. That string alternative is not part of the response contract, so it is
///   removed from the schema, leaving the plain numeric type.</description></item>
/// </list>
/// Member nullability is read from <see cref="NullabilityInfo.ReadState"/> (the value the API returns),
/// which avoids treating get-only members as nullable. Required and enum orderings are emitted in a
/// stable ordinal sort so the committed document is deterministic across builds.
/// </summary>
internal sealed class ContractSchemaTransformer : IOpenApiSchemaTransformer
{
    public Task TransformAsync(
        OpenApiSchema schema,
        OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        // The lenient numeric string form is an input convenience, never part of the emitted
        // contract. Strip it wherever it appears in this schema subtree.
        NormalizeNumericStringUnion(schema);

        var typeInfo = context.JsonTypeInfo;

        // Enums serialize as named strings (camelCase). The framework already populates the string
        // members; make the string typing explicit and drop any numeric format left behind.
        if (typeInfo.Type.IsEnum)
        {
            schema.Type = JsonSchemaType.String;
            schema.Format = null;
            return Task.CompletedTask;
        }

        if (typeInfo.Kind != JsonTypeInfoKind.Object || schema.Properties is not { Count: > 0 })
            return Task.CompletedTask;

        // One context per call: NullabilityInfoContext is not thread-safe.
        var nullability = new NullabilityInfoContext();
        var required = new SortedSet<string>(StringComparer.Ordinal);

        foreach (var property in typeInfo.Properties)
        {
            if (!schema.Properties.TryGetValue(property.Name, out var propertySchema))
                continue;

            var isNullable = IsMemberNullable(property, nullability);

            // Required iff the member is always present on the wire: non-nullable with no default.
            if (!isNullable && propertySchema.Default is null)
                required.Add(property.Name);

            ApplyNullability(schema, property.Name, propertySchema, isNullable);
        }

        schema.Required = required;
        return Task.CompletedTask;
    }

    private static bool IsMemberNullable(JsonPropertyInfo property, NullabilityInfoContext nullability)
    {
        var propertyType = property.PropertyType;
        if (propertyType.IsValueType)
            return Nullable.GetUnderlyingType(propertyType) is not null;

        return property.AttributeProvider switch
        {
            PropertyInfo info => nullability.Create(info).ReadState == NullabilityState.Nullable,
            FieldInfo info => nullability.Create(info).ReadState == NullabilityState.Nullable,
            // Unknown provider: treat as nullable so the member stays optional rather than
            // over-constraining the contract.
            _ => true,
        };
    }

    private static void ApplyNullability(
        OpenApiSchema owner,
        string propertyName,
        IOpenApiSchema propertySchema,
        bool isNullable)
    {
        switch (propertySchema)
        {
            // Leaf schema with a concrete type set: toggle the null bit in place.
            case OpenApiSchema inline when inline.Type is JsonSchemaType type
                && IsSimpleTyped(inline):
                inline.Type = isNullable ? type | JsonSchemaType.Null : type & ~JsonSchemaType.Null;
                break;

            // Reference to a named schema (e.g. an enum or nested type). The reference cannot carry a
            // null type directly, so a nullable member is expressed as a union with the null type.
            case OpenApiSchemaReference reference when isNullable:
                owner.Properties![propertyName] = new OpenApiSchema
                {
                    AnyOf = new List<IOpenApiSchema>
                    {
                        reference,
                        new OpenApiSchema { Type = JsonSchemaType.Null },
                    },
                };
                break;
        }
    }

    // A "simple typed" schema is a leaf (no composition keywords) whose null bit we can safely flip.
    private static bool IsSimpleTyped(OpenApiSchema schema) =>
        (schema.AnyOf is null || schema.AnyOf.Count == 0)
        && (schema.OneOf is null || schema.OneOf.Count == 0)
        && (schema.AllOf is null || schema.AllOf.Count == 0);

    private static void NormalizeNumericStringUnion(IOpenApiSchema? schema)
    {
        if (schema is not OpenApiSchema concrete)
            return;

        if (concrete.Type is JsonSchemaType type
            && (type.HasFlag(JsonSchemaType.Integer) || type.HasFlag(JsonSchemaType.Number))
            && type.HasFlag(JsonSchemaType.String))
        {
            concrete.Type = type & ~JsonSchemaType.String;
            // The pattern only validated the string form that was just removed.
            concrete.Pattern = null;
        }

        if (concrete.Properties is { Count: > 0 })
        {
            foreach (var child in concrete.Properties.Values)
                NormalizeNumericStringUnion(child);
        }

        NormalizeNumericStringUnion(concrete.Items);
        NormalizeNumericStringUnion(concrete.AdditionalProperties);
        NormalizeComposition(concrete.AnyOf);
        NormalizeComposition(concrete.OneOf);
        NormalizeComposition(concrete.AllOf);
    }

    private static void NormalizeComposition(IList<IOpenApiSchema>? members)
    {
        if (members is null)
            return;

        foreach (var member in members)
            NormalizeNumericStringUnion(member);
    }
}
