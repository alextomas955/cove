using Cove.Core.DTOs;
using Cove.Core.Entities;

namespace Cove.Api.Helpers;

/// <summary>
/// Pure merge rules for bulk custom field edits. Values are compared by their typed content only,
/// never by definition id or position, so template rows and stored rows compare alike.
/// </summary>
internal static class CustomFieldValueMerger
{
    /// <summary>
    /// Computes the next value list for one field on one entity.
    /// Returns <c>null</c> when the field would not change, otherwise the resulting values in order.
    /// Returned items may be existing rows or request template rows; callers clone them into fresh rows.
    /// </summary>
    public static IReadOnlyList<CustomFieldValue>? Merge(
        IReadOnlyList<CustomFieldValue> current,
        IReadOnlyList<CustomFieldValue> requested,
        BulkUpdateMode mode,
        bool isMultiValue,
        Func<CustomFieldValue, CustomFieldValue, bool> sameContent)
    {
        switch (mode)
        {
            case BulkUpdateMode.Set:
                return ReplaceIfChanged(current, DistinctByContent(requested, sameContent), sameContent);

            case BulkUpdateMode.Add:
                if (requested.Count == 0)
                    return null;
                if (!isMultiValue)
                    return ReplaceIfChanged(current, DistinctByContent(requested, sameContent), sameContent);

                var appended = new List<CustomFieldValue>(current);
                foreach (var value in requested)
                {
                    if (appended.Any(existing => sameContent(existing, value)))
                        continue;
                    appended.Add(value);
                }

                return appended.Count == current.Count ? null : appended;

            case BulkUpdateMode.Remove:
                var retained = current
                    .Where(existing => !requested.Any(value => sameContent(existing, value)))
                    .ToList();
                return retained.Count == current.Count ? null : retained;

            default:
                return null;
        }
    }

    private static IReadOnlyList<CustomFieldValue>? ReplaceIfChanged(
        IReadOnlyList<CustomFieldValue> current,
        IReadOnlyList<CustomFieldValue> next,
        Func<CustomFieldValue, CustomFieldValue, bool> sameContent)
    {
        if (current.Count == next.Count && current.Zip(next).All(pair => sameContent(pair.First, pair.Second)))
            return null;
        return next;
    }

    private static IReadOnlyList<CustomFieldValue> DistinctByContent(
        IReadOnlyList<CustomFieldValue> values,
        Func<CustomFieldValue, CustomFieldValue, bool> sameContent)
    {
        var distinct = new List<CustomFieldValue>(values.Count);
        foreach (var value in values)
        {
            if (distinct.Any(existing => sameContent(existing, value)))
                continue;
            distinct.Add(value);
        }

        return distinct;
    }
}
