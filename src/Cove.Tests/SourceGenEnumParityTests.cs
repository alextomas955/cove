using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Cove.Core.Common;

namespace Cove.Tests;

// An unpinned, multi-word enum: camelCase ("multiWordValue") and PascalCase ("MultiWordValue")
// differ, so the wire string reveals which naming rule the source-gen path actually applied.
// No [JsonStringEnumMemberName] pin — this is exactly the unpinned enum member WR-02 warns about.
internal enum ProbeEnum
{
    MultiWordValue,
    AnotherValue,
}

internal sealed record EnumBearingDto(ProbeEnum Value);

// A source-gen context whose [JsonSourceGenerationOptions] mirror the production CoveJsonContext
// exactly (camelCase properties, UseStringEnumConverter). Registering EnumBearingDto forces the
// enum through the source-generated metadata rather than the reflection fallback.
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    UseStringEnumConverter = true)]
[JsonSerializable(typeof(EnumBearingDto))]
internal partial class ProbeJsonContext : JsonSerializerContext
{
}

/// <summary>
/// Guards against a source-gen vs reflection split-brain for enums. Registered host DTOs serialize
/// through source-generated metadata, where <c>UseStringEnumConverter = true</c> emits a per-type
/// string-enum converter; the reflection-fallback path camelCases enums via the global converter on
/// the options. This test builds options identically to <see cref="CoveJson.Default"/> — the
/// source-gen context combined with a reflection resolver plus the global camelCase string-enum
/// converter — and asserts an unpinned, multi-word enum on a registered DTO still emits the same
/// camelCase string on the source-gen path, so the two boundaries cannot diverge.
/// </summary>
public class SourceGenEnumParityTests
{
    // Options built the same way CoveJson.Default is, but over the probe source-gen context.
    private static JsonSerializerOptions BuildSourceGenOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            TypeInfoResolver = JsonTypeInfoResolver.Combine(
                ProbeJsonContext.Default,
                new DefaultJsonTypeInfoResolver()),
        };
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        options.MakeReadOnly();
        return options;
    }

    [Fact]
    public void UnpinnedEnumOnRegisteredDto_SerializesToCamelCaseString_ViaSourceGenPath()
    {
        var json = JsonSerializer.Serialize(new EnumBearingDto(ProbeEnum.MultiWordValue), BuildSourceGenOptions());

        // camelCase named string — never PascalCase, never the underlying integer.
        Assert.Contains("\"value\":\"multiWordValue\"", json);
        Assert.DoesNotContain("MultiWordValue", json);
        Assert.DoesNotContain("\"value\":0", json);
    }
}
