using System.Text.Json;
using System.Text.Json.Serialization;
using Cove.Core.Entities;
using Cove.Core.Interfaces;

namespace Cove.Data.Repositories;

/// <summary>Checks relative rules in persisted filter JSON without rewriting their values.</summary>
public static class RelativeDateFilterJson
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static bool ContainsRelativeRule(object filter) => ContainsRelativeRule(JsonSerializer.SerializeToElement(filter, Options));

    private static bool ContainsRelativeRule(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => element.EnumerateObject().Any(property => ContainsRelativeRule(property.Value)),
        JsonValueKind.Array => element.EnumerateArray().Any(ContainsRelativeRule),
        JsonValueKind.String => RelativeDateEvaluation.IsRelativeExpression(element.GetString()),
        _ => false,
    };

    public static void Validate(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return;
        JsonDocument document;
        try { document = JsonDocument.Parse(json); }
        catch (JsonException) { return; } // Preserve the existing saved-filter contract for legacy JSON.
        using (document) ValidateElement(document.RootElement);
    }

    private static readonly HashSet<string> DateKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "dateCriterion", "productionDateCriterion", "birthdateCriterion", "deathDateCriterion", "careerStartCriterion", "careerEndCriterion",
    };
    private static readonly HashSet<string> TimestampKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "addedAtCriterion", "createdAtCriterion", "updatedAtCriterion", "lastPlayedAtCriterion", "lastLikedAtCriterion",
        "lastReadAtCriterion", "lastResolvedAtCriterion", "fileModTimeCriterion", "rawCreatedAtCriterion", "rawUpdatedAtCriterion",
    };
    private static readonly HashSet<string> CustomFieldKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "customFieldCriterion", "customFieldCriteria",
    };
    private static readonly HashSet<string> ContainerKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "objectFilter", "filterExpression", "_filterExpression", "children", "filter", "group",
        "performerFilterCriterion", "videoFilterCriterion", "audioFilterCriterion", "rawSegmentFilters",
    };

    private static void ValidateElement(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray()) ValidateElement(item);
        }
        else if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                var isDate = DateKeys.Contains(property.Name);
                if ((isDate || TimestampKeys.Contains(property.Name)) && property.Value.ValueKind == JsonValueKind.Object)
                    ValidateCriterion(property.Value, isDate);
                else if (CustomFieldKeys.Contains(property.Name)) ValidateCustomFieldCriteria(property.Value);
                else if (ContainerKeys.Contains(property.Name)) ValidateElement(property.Value);
            }
        }
    }

    private static void ValidateCriterion(JsonElement criterion, bool isDate)
    {
        var value = GetStringProperty(criterion, "value") ?? "";
        var value2 = GetStringProperty(criterion, "value2");
        if (isDate) RelativeDateEvaluation.Resolve(new DateCriterion { Value = value, Value2 = value2 });
        else RelativeDateEvaluation.Resolve(new TimestampCriterion { Value = value, Value2 = value2 });
    }

    private static void ValidateCustomFieldCriteria(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray()) ValidateCustomFieldCriteria(item);
            return;
        }

        // JSON-path criteria are typed by the path, which never resolves relative offsets.
        if (element.ValueKind != JsonValueKind.Object || !string.IsNullOrWhiteSpace(GetStringProperty(element, "jsonPath"))) return;
        var type = GetStringProperty(element, "type");
        if (CustomFieldTypes.IsDateLike(type)) ValidateCriterion(element, isDate: true);
        else if (CustomFieldTypes.IsTimestampLike(type)) ValidateCriterion(element, isDate: false);
    }

    private static string? GetStringProperty(JsonElement element, string name)
    {
        foreach (var property in element.EnumerateObject())
            if (property.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && property.Value.ValueKind == JsonValueKind.String)
                return property.Value.GetString();
        return null;
    }
}
