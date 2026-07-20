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
/// </summary>
internal sealed class ContractSchemaTransformer : IOpenApiSchemaTransformer
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

        // A default instance (when the type is parameterless-constructible) reveals initializers on
        // value-type members that the schema does not otherwise capture, e.g. `Mode Foo { get; init;
        // } = Add`. Restricted to value types so initialized string/reference response fields, which
        // callers read as always-present, stay required.
        var defaultInstance = TryCreateDefault(typeInfo.Type);

        foreach (var property in typeInfo.Properties)
        {
            if (!schema.Properties.TryGetValue(property.Name, out var propertySchema))
                continue;

            // Required iff the member is always present: non-nullable and never left to a default.
            // A schema default or a value-type initializer (e.g. an enum defaulting to a value) marks
            // it optional. Request shapes get a broader relaxation applied later once request/response
            // usage is known.
            if (!IsMemberNullable(property, nullability)
                && propertySchema.Default is null
                && !HasValueTypeInitializer(property, defaultInstance))
            {
                required.Add(property.Name);
            }
        }

        schema.Required = required;
        return Task.CompletedTask;
    }

    private static object? TryCreateDefault(Type type)
    {
        if (type.IsAbstract || type.IsInterface || type.IsGenericTypeDefinition)
            return null;

        var constructor = type.GetConstructor(Type.EmptyTypes);
        if (constructor is null || !constructor.IsPublic)
            return null;

        try
        {
            return Activator.CreateInstance(type);
        }
        catch
        {
            return null;
        }
    }

    // True when a value-type member holds a non-default value on a freshly constructed instance — a
    // member initializer — which means the caller can omit it (e.g. an enum defaulting to a specific
    // value). Only value types are considered so initialized string/reference fields the API always
    // returns are not made optional.
    private static bool HasValueTypeInitializer(JsonPropertyInfo property, object? defaultInstance)
    {
        if (defaultInstance is null
            || !property.PropertyType.IsValueType
            || Nullable.GetUnderlyingType(property.PropertyType) is not null
            || property.AttributeProvider is not PropertyInfo { GetMethod: not null } info)
        {
            return false;
        }

        object? value;
        try
        {
            value = info.GetValue(defaultInstance);
        }
        catch
        {
            return false;
        }

        var clrDefault = Activator.CreateInstance(info.PropertyType);
        return !Equals(value, clrDefault);
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

        for (var i = members.Count - 1; i >= 0; i--)
        {
            if (members.Count > 1 && members[i] is OpenApiSchema { Type: JsonSchemaType.Null })
                members.RemoveAt(i);
        }
    }

    private static void NormalizeAll(IList<IOpenApiSchema>? members)
    {
        if (members is null)
            return;

        foreach (var member in members)
            Normalize(member);
    }
}
