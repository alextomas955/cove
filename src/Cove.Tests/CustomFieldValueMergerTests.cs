using Cove.Api.Helpers;
using Cove.Api.Services;
using Cove.Core.DTOs;
using Cove.Core.Entities;

namespace Cove.Tests;

public class CustomFieldValueMergerTests
{
    private static CustomFieldValue Reference(int id) => new() { IntegerValue = id, DefinitionId = 7, Position = 99 };

    private static IReadOnlyList<CustomFieldValue>? Merge(int[] current, int[] requested, BulkUpdateMode mode, bool isMultiValue = true)
        => CustomFieldValueMerger.Merge(
            current.Select(Reference).ToList(),
            requested.Select(Reference).ToList(),
            mode,
            isMultiValue,
            CustomFieldService.SameContent);

    private static int[] Ids(IReadOnlyList<CustomFieldValue>? values) => values!.Select(value => value.IntegerValue!.Value).ToArray();

    [Fact]
    public void SetReplacesMultiValueListInRequestOrderWithoutDuplicates()
    {
        Assert.Equal([3, 1, 2], Ids(Merge([1, 2], [3, 1, 2, 3], BulkUpdateMode.Set)));
        Assert.Null(Merge([1, 2], [1, 2], BulkUpdateMode.Set));
        Assert.Null(Merge([1, 2], [1, 2, 2], BulkUpdateMode.Set));
        Assert.Equal([2, 1], Ids(Merge([1, 2], [2, 1], BulkUpdateMode.Set)));
        Assert.Empty(Merge([1], [], BulkUpdateMode.Set)!);
        Assert.Null(Merge([], [], BulkUpdateMode.Set));
    }

    [Fact]
    public void SetReplacesSingleValue()
    {
        Assert.Equal([2], Ids(Merge([1], [2], BulkUpdateMode.Set, isMultiValue: false)));
        Assert.Null(Merge([1], [1], BulkUpdateMode.Set, isMultiValue: false));
    }

    [Fact]
    public void AddAppendsMissingMultiValuesAfterExistingOnes()
    {
        Assert.Equal([1, 2, 3, 4], Ids(Merge([1, 2], [3, 2, 4, 3], BulkUpdateMode.Add)));
        Assert.Null(Merge([1, 2], [2, 1], BulkUpdateMode.Add));
        Assert.Null(Merge([1], [], BulkUpdateMode.Add));
        Assert.Equal([5], Ids(Merge([], [5, 5], BulkUpdateMode.Add)));
    }

    [Fact]
    public void AddBehavesLikeSetForSingleValue()
    {
        Assert.Equal([2], Ids(Merge([1], [2], BulkUpdateMode.Add, isMultiValue: false)));
        Assert.Null(Merge([1], [1], BulkUpdateMode.Add, isMultiValue: false));
        Assert.Equal([2], Ids(Merge([], [2], BulkUpdateMode.Add, isMultiValue: false)));
    }

    [Fact]
    public void AddWithNoValuesNeverClears()
    {
        Assert.Null(Merge([1], [], BulkUpdateMode.Add, isMultiValue: false));
        Assert.Null(Merge([1], [], BulkUpdateMode.Add, isMultiValue: true));
        Assert.Empty(Merge([1], [], BulkUpdateMode.Set, isMultiValue: false)!);
    }

    [Fact]
    public void RemoveDropsPresentMultiValuesOnly()
    {
        Assert.Equal([2], Ids(Merge([1, 2, 3], [3, 1, 9], BulkUpdateMode.Remove)));
        Assert.Null(Merge([1, 2], [3], BulkUpdateMode.Remove));
        Assert.Null(Merge([], [3], BulkUpdateMode.Remove));
        Assert.Empty(Merge([1], [1], BulkUpdateMode.Remove)!);
    }

    [Fact]
    public void RemoveClearsSingleValueOnlyWhenEqual()
    {
        Assert.Empty(Merge([1], [1], BulkUpdateMode.Remove, isMultiValue: false)!);
        Assert.Null(Merge([1], [2], BulkUpdateMode.Remove, isMultiValue: false));
    }

    [Fact]
    public void ContentComparisonIgnoresDefinitionAndPosition()
    {
        var stored = new CustomFieldValue { TextValue = "same", DefinitionId = 1, Position = 0, EntityId = 4 };
        var template = new CustomFieldValue { TextValue = "same" };

        Assert.Null(CustomFieldValueMerger.Merge([stored], [template], BulkUpdateMode.Add, true, CustomFieldService.SameContent));
    }

    [Fact]
    public void UndefinedModeDoesNotChangeValues()
    {
        Assert.Null(Merge([1], [2], (BulkUpdateMode)3));
    }
}
