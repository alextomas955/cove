using System.Text.Json;
using System.Text.Json.Serialization;
using Cove.Core.Interfaces;

namespace Cove.Core.Common;

/// <summary>
/// Type-specific converter for <see cref="CriterionModifier"/>. Writes the camelCase named
/// string (identical to the shared string-enum policy), but reads more leniently: it accepts
/// separator-insensitive, case-insensitive forms (e.g. <c>greater_than</c>, <c>GREATER_THAN</c>,
/// <c>greater than</c>) in addition to the canonical camelCase string and the underlying integer.
///
/// Registered on the canonical options ahead of the global string-enum converter; a type-specific
/// <see cref="JsonConverter{T}"/> takes precedence, so <see cref="CriterionModifier"/> keeps this
/// extra read leniency while every other enum flows through the global camelCase policy. The wire
/// names are public API — do not rename the members without keeping the emitted strings stable.
/// </summary>
public sealed class CriterionModifierJsonConverter : JsonConverter<CriterionModifier>
{
    public override CriterionModifier Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String && TryParse(reader.GetString(), out var modifier))
            return modifier;

        if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out var numeric) && Enum.IsDefined(typeof(CriterionModifier), numeric))
            return (CriterionModifier)numeric;

        throw new JsonException($"Invalid criterion modifier token '{reader.TokenType}'.");
    }

    public override void Write(Utf8JsonWriter writer, CriterionModifier value, JsonSerializerOptions options)
        => writer.WriteStringValue(JsonNamingPolicy.CamelCase.ConvertName(value.ToString()));

    private static bool TryParse(string? value, out CriterionModifier modifier)
    {
        modifier = default;
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = Normalize(value);
        foreach (var name in Enum.GetNames<CriterionModifier>())
        {
            if (!string.Equals(Normalize(name), normalized, StringComparison.OrdinalIgnoreCase))
                continue;

            modifier = Enum.Parse<CriterionModifier>(name);
            return true;
        }

        return false;
    }

    private static string Normalize(string value)
        => new(value.Where(char.IsLetterOrDigit).ToArray());
}
