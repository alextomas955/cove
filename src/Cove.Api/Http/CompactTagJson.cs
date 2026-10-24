using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Cove.Core.DTOs;

namespace Cove.Api.Http;

/// <summary>
/// Leaves unset fields out of serialized tags. A tag has some twenty optional fields, mostly unset, and
/// every listed video, audio or text repeats its whole tag set. An absent field reads as null in every
/// client, so nothing else changes; values that are set, including false and empty lists, are written.
/// </summary>
internal static class CompactTagJson
{
    public static void Apply(JsonSerializerOptions options)
        => options.TypeInfoResolver = (options.TypeInfoResolver ?? new DefaultJsonTypeInfoResolver())
            .WithAddedModifier(OmitNullTagFields);

    private static void OmitNullTagFields(JsonTypeInfo typeInfo)
    {
        if (typeInfo.Type != typeof(TagDto))
            return;

        foreach (var property in typeInfo.Properties)
        {
            if (!property.PropertyType.IsValueType || Nullable.GetUnderlyingType(property.PropertyType) != null)
                property.ShouldSerialize = static (_, value) => value is not null;
        }
    }
}
