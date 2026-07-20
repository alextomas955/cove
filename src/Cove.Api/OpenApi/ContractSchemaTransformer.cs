using System.Reflection;
using System.Text.Json.Serialization.Metadata;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Cove.Api.OpenApi;

/// <summary>
/// Aligns the emitted OpenAPI schema with the server's actual wire contract so that generated
/// clients match the shapes the API really produces and accepts. Adjustments are all sourced from
/// the CLR type metadata (nullable-reference annotations and value-type nullability) rather than
/// from any hand-maintained list:
/// <list type="bullet">
///   <item><description><b>Required members.</b> A property is marked required when its member is
///   non-nullable and carries no default, i.e. the API always emits it. Nullable or defaulted members
///   are optional, which is how the contract expresses "may be absent". Nullability is read from
///   <see cref="NullabilityInfo.ReadState"/> — the value the API returns — which avoids treating
///   get-only members as nullable.</description></item>
///   <item><description><b>Optional-not-null modelling.</b> The contract expresses an absent value by
///   omitting the property, not by sending an explicit JSON <c>null</c>. The <c>null</c> type is
///   therefore removed from every schema (and from the union branches that carry it), so a member is
///   either present with a value or absent. This keeps the emitted types aligned with how the client
///   consumes them.</description></item>
///   <item><description><b>Numeric read tolerance.</b> Numeric members accept a string form on read
///   (a lenient input convenience), which surfaces as an <c>["integer","string"]</c> union plus a
///   validation pattern. That string alternative is not part of the response contract, so it is
///   removed, leaving the plain numeric type.</description></item>
/// </list>
/// Required members are emitted in a stable ordinal sort so the committed document is deterministic
/// across builds.
///
/// For each object schema it also records — via <paramref name="requestRequired"/> — the subset of
/// required members that a request body genuinely mandates (a non-nullable, no-default constructor
/// parameter of reference type). <see cref="RequestSchemaRelaxationTransformer"/> uses that to relax
/// the optional-on-input members of request-only shapes without dropping the mandatory ones.
/// </summary>
internal sealed class ContractSchemaTransformer(RequestRequiredMembers requestRequired) : IOpenApiSchemaTransformer
{
    public Task TransformAsync(
        OpenApiSchema schema,
        OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        // Remove the lenient numeric string form and the null type from this schema subtree. Absence
        // is modelled by optionality (the required set), not by an explicit null.
        Normalize(schema);

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
        var inputRequired = new HashSet<string>(StringComparer.Ordinal);

        // Constructor parameters of the longest constructor identify the type's mandatory inputs
        // (records author every member as a primary-constructor parameter). Members set through a
        // plain property, by contrast, carry an initializer default and are optional on input.
        var constructorParameters = GetConstructorParameters(typeInfo.Type);

        foreach (var property in typeInfo.Properties)
        {
            if (!schema.Properties.TryGetValue(property.Name, out var propertySchema))
                continue;

            // Required iff the member is always present: non-nullable with no default. A schema
            // default marks it optional. Request shapes get a broader relaxation applied later once
            // request/response usage is known.
            if (!IsMemberNullable(property, nullability)
                && propertySchema.Default is null)
            {
                required.Add(property.Name);

                // A request body genuinely mandates this member only when omitting it yields an
                // invalid value: a non-nullable reference-typed constructor parameter with no
                // default deserializes to null. Value types fall back to their CLR default and
                // members without a matching constructor parameter carry an initializer default, so
                // both are optional on input and left out of the request-required set.
                if (!property.PropertyType.IsValueType
                    && TryGetConstructorParameter(property, constructorParameters, out var parameter)
                    && !parameter.HasDefaultValue)
                {
                    inputRequired.Add(property.Name);
                }
            }
        }

        schema.Required = required;
        requestRequired.Record(schema, inputRequired);
        return Task.CompletedTask;
    }

    private static ParameterInfo[] GetConstructorParameters(Type type)
    {
        ConstructorInfo? longest = null;
        foreach (var constructor in type.GetConstructors())
        {
            if (longest is null || constructor.GetParameters().Length > longest.GetParameters().Length)
                longest = constructor;
        }

        return longest?.GetParameters() ?? [];
    }

    private static bool TryGetConstructorParameter(
        JsonPropertyInfo property,
        ParameterInfo[] parameters,
        out ParameterInfo parameter)
    {
        // Match the JSON member back to its constructor parameter by the CLR member name; parameter
        // names mirror the property names they initialize.
        var memberName = (property.AttributeProvider as MemberInfo)?.Name ?? property.Name;
        foreach (var candidate in parameters)
        {
            if (string.Equals(candidate.Name, memberName, StringComparison.OrdinalIgnoreCase))
            {
                parameter = candidate;
                return true;
            }
        }

        parameter = null!;
        return false;
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

    private static void Normalize(IOpenApiSchema? schema)
    {
        if (schema is not OpenApiSchema concrete)
            return;

        if (concrete.Type is JsonSchemaType type)
        {
            // Drop the lenient numeric string alternative (and the pattern that validated it).
            if ((type.HasFlag(JsonSchemaType.Integer) || type.HasFlag(JsonSchemaType.Number))
                && type.HasFlag(JsonSchemaType.String))
            {
                type &= ~JsonSchemaType.String;
                concrete.Pattern = null;
            }

            // Drop the null alternative unless the schema is the standalone null branch of a union
            // (that branch is removed from its parent union below).
            if (type.HasFlag(JsonSchemaType.Null) && type != JsonSchemaType.Null)
                type &= ~JsonSchemaType.Null;

            concrete.Type = type;
        }

        // A free-form object (a dictionary such as Dictionary<string, object>) surfaces as a bare
        // object with no declared properties and no additional-property schema. Give it an open
        // additional-property schema so it is a map of arbitrary values rather than an object that
        // forbids every key.
        if (concrete.Type == JsonSchemaType.Object
            && (concrete.Properties is null || concrete.Properties.Count == 0)
            && concrete.AdditionalProperties is null
            && (concrete.AllOf is null || concrete.AllOf.Count == 0)
            && (concrete.OneOf is null || concrete.OneOf.Count == 0)
            && (concrete.AnyOf is null || concrete.AnyOf.Count == 0))
        {
            concrete.AdditionalProperties = new OpenApiSchema();
        }

        RemoveNullBranches(concrete.AnyOf);
        RemoveNullBranches(concrete.OneOf);

        if (concrete.Properties is { Count: > 0 })
        {
            foreach (var child in concrete.Properties.Values)
                Normalize(child);
        }

        Normalize(concrete.Items);
        Normalize(concrete.AdditionalProperties);
        NormalizeAll(concrete.AnyOf);
        NormalizeAll(concrete.OneOf);
        NormalizeAll(concrete.AllOf);
    }

    // Removes the explicit null branch from a union (e.g. oneOf: [ {type:null}, {$ref} ]) so a
    // nullable reference becomes the referenced type, with absence carried by optionality.
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
    // nullable-typed subschema is never discarded. Matches ContractDocumentTransformer's guard.
    private static bool IsNullOnly(OpenApiSchema schema) =>
        schema.Type == JsonSchemaType.Null
        && (schema.OneOf is null || schema.OneOf.Count == 0)
        && (schema.AnyOf is null || schema.AnyOf.Count == 0)
        && (schema.AllOf is null || schema.AllOf.Count == 0)
        && (schema.Properties is null || schema.Properties.Count == 0);

    private static void NormalizeAll(IList<IOpenApiSchema>? members)
    {
        if (members is null)
            return;

        foreach (var member in members)
            Normalize(member);
    }
}
