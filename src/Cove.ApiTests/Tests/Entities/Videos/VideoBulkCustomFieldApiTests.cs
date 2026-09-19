using System.Net;
using System.Text.Json;
using Cove.ApiTests.Builders;
using Cove.ApiTests.Infrastructure;
using Cove.Core.DTOs;
using Cove.Core.Entities;

namespace Cove.ApiTests.Tests.Entities.Videos;

public sealed class VideoBulkCustomFieldApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/videos/bulk")]
    public async Task GivenMultiValueTagField_WhenBulkAddRemoveAndSetAreApplied_ThenValuesMergeInOrderAndOtherFieldsStay()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var absentKey = await CreateTagFieldAsync($"absent_{suffix}", ct);
        var otherKey = await CreateTagFieldAsync($"other_{suffix}", ct);
        var tags = await Task.WhenAll(Enumerable.Range(1, 4).Select(index => AsUser().CreateTagAsync($"Field tag {index} {suffix}", ct)));
        var seeded = await AsUser().CreateVideoAsync(new VideoBuilder()
            .WithTitle($"Seeded {suffix}")
            .WithCustomField(absentKey, new[] { tags[0].Id })
            .WithCustomField(otherKey, new[] { tags[3].Id })
            .Build(), ct);
        var empty = await AsUser().CreateVideoAsync($"Empty {suffix}", ct);
        var control = await AsUser().CreateVideoAsync(new VideoBuilder()
            .WithTitle($"Control {suffix}")
            .WithCustomField(absentKey, new[] { tags[0].Id })
            .Build(), ct);
        var ids = new List<int> { seeded.Id, empty.Id };

        // Add appends missing values after existing ones and ignores repeats.
        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = ids,
            CustomFields = new() { [absentKey] = new[] { tags[1].Id, tags[0].Id, tags[1].Id } },
            CustomFieldMode = BulkUpdateMode.Add,
        }, ct);
        var afterAdd = await GetVideosAsync(ids, ct);
        TagIds(afterAdd[0], absentKey).Should().Equal(tags[0].Id, tags[1].Id);
        TagIds(afterAdd[1], absentKey).Should().Equal(tags[1].Id, tags[0].Id);
        TagIds(afterAdd[0], otherKey).Should().Equal(tags[3].Id);

        // Remove drops present values only; keys match case-insensitively.
        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = ids,
            CustomFields = new() { [absentKey.ToUpperInvariant()] = new[] { tags[0].Id, tags[2].Id } },
            CustomFieldMode = BulkUpdateMode.Remove,
        }, ct);
        var afterRemove = await GetVideosAsync(ids, ct);
        afterRemove.Should().AllSatisfy(video => TagIds(video, absentKey).Should().Equal(tags[1].Id));

        // Set replaces the list in request order.
        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = ids,
            CustomFields = new() { [absentKey] = new[] { tags[2].Id, tags[1].Id } },
            CustomFieldMode = BulkUpdateMode.Set,
        }, ct);
        var afterSet = await GetVideosAsync(ids, ct);
        afterSet.Should().AllSatisfy(video => TagIds(video, absentKey).Should().Equal(tags[2].Id, tags[1].Id));
        TagIds(afterSet[0], otherKey).Should().Equal(tags[3].Id);
        TagIds(afterSet[1], otherKey).Should().BeEmpty();

        var controlAfter = await AsUser().GetVideoByIdAsync(control.Id, ct);
        TagIds(controlAfter, absentKey).Should().Equal(tags[0].Id);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/videos/bulk")]
    public async Task GivenSingleValueTextField_WhenBulkAddAndRemoveAreApplied_ThenAddReplacesAndRemoveClearsOnlyOnMatch()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var key = await CreateTextFieldAsync($"note_{suffix}", ct);
        var first = await AsUser().CreateVideoAsync(new VideoBuilder().WithTitle($"First {suffix}").WithCustomField(key, "old").Build(), ct);
        var second = await AsUser().CreateVideoAsync($"Second {suffix}", ct);
        var ids = new List<int> { first.Id, second.Id };

        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = ids,
            CustomFields = new() { [key] = "new" },
            CustomFieldMode = BulkUpdateMode.Add,
        }, ct);
        var afterAdd = await GetVideosAsync(ids, ct);
        afterAdd.Should().AllSatisfy(video => Text(video, key).Should().Be("new"));

        // A blank value carries nothing: Add leaves the field alone instead of clearing it.
        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = ids,
            CustomFields = new() { [key] = "  " },
            CustomFieldMode = BulkUpdateMode.Add,
        }, ct);
        var afterBlankAdd = await GetVideosAsync(ids, ct);
        afterBlankAdd.Should().AllSatisfy(video => Text(video, key).Should().Be("new"));

        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = ids,
            CustomFields = new() { [key] = "other" },
            CustomFieldMode = BulkUpdateMode.Remove,
        }, ct);
        var afterMismatchedRemove = await GetVideosAsync(ids, ct);
        afterMismatchedRemove.Should().AllSatisfy(video => Text(video, key).Should().Be("new"));

        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = ids,
            CustomFields = new() { [key] = "new" },
            CustomFieldMode = BulkUpdateMode.Remove,
        }, ct);
        var afterRemove = await GetVideosAsync(ids, ct);
        afterRemove.Should().AllSatisfy(video => Text(video, key).Should().BeNull());
    }

    [Fact]
    [CoversEndpoint("POST", "/api/videos/bulk")]
    public async Task GivenFieldValues_WhenClearFieldsNamesACustomField_ThenOnlyThatFieldIsEmptied()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var absentKey = await CreateTagFieldAsync($"absent_{suffix}", ct);
        var noteKey = await CreateTextFieldAsync($"note_{suffix}", ct);
        var tag = await AsUser().CreateTagAsync($"Field tag {suffix}", ct);
        var video = await AsUser().CreateVideoAsync(new VideoBuilder()
            .WithTitle($"Cleared {suffix}")
            .WithCustomField(absentKey, new[] { tag.Id })
            .WithCustomField(noteKey, "keep")
            .Build(), ct);
        var control = await AsUser().CreateVideoAsync(new VideoBuilder()
            .WithTitle($"Control {suffix}")
            .WithCustomField(absentKey, new[] { tag.Id })
            .Build(), ct);

        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = [video.Id],
            ClearFields = [$"customFields.{absentKey}"],
        }, ct);

        var after = await AsUser().GetVideoByIdAsync(video.Id, ct);
        TagIds(after, absentKey).Should().BeEmpty();
        Text(after, noteKey).Should().Be("keep");
        TagIds(await AsUser().GetVideoByIdAsync(control.Id, ct), absentKey).Should().Equal(tag.Id);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/videos/bulk")]
    public async Task GivenTagModeAndCustomFieldMode_WhenSentTogether_ThenBothApplyIndependently()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var absentKey = await CreateTagFieldAsync($"absent_{suffix}", ct);
        var tag = await AsUser().CreateTagAsync($"Assessed tag {suffix}", ct);
        var video = await AsUser().CreateVideoAsync(new VideoBuilder().WithTitle($"Assessed {suffix}").WithTags([tag]).Build(), ct);

        // Mark absent: remove the tag, record it as confirmed absent.
        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = [video.Id],
            TagIds = [tag.Id],
            TagMode = BulkUpdateMode.Remove,
            CustomFields = new() { [absentKey] = new[] { tag.Id } },
            CustomFieldMode = BulkUpdateMode.Add,
        }, ct);
        var absent = await AsUser().GetVideoByIdAsync(video.Id, ct);
        absent.Tags.Select(item => item.Id).Should().NotContain(tag.Id);
        TagIds(absent, absentKey).Should().Equal(tag.Id);

        // Mark present: add the tag back, drop it from the absent list.
        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = [video.Id],
            TagIds = [tag.Id],
            TagMode = BulkUpdateMode.Add,
            CustomFields = new() { [absentKey] = new[] { tag.Id } },
            CustomFieldMode = BulkUpdateMode.Remove,
        }, ct);
        var present = await AsUser().GetVideoByIdAsync(video.Id, ct);
        present.Tags.Select(item => item.Id).Should().Contain(tag.Id);
        TagIds(present, absentKey).Should().BeEmpty();
    }

    [Fact]
    [CoversEndpoint("POST", "/api/videos/bulk")]
    public async Task GivenInvalidCustomFieldRequests_WhenBulkUpdateRuns_ThenEachIsRejectedWithNothingApplied()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var absentKey = await CreateTagFieldAsync($"absent_{suffix}", ct);
        var performerOnlyKey = await CreateTextFieldAsync($"performer_only_{suffix}", ct, CustomFieldEntityTypes.Performer);
        var tag = await AsUser().CreateTagAsync($"Kept tag {suffix}", ct);
        var video = await AsUser().GetVideoByIdAsync(
            (await AsUser().CreateVideoAsync(new VideoBuilder().WithTitle($"Rejected {suffix}").Build(), ct)).Id, ct);

        var invalidRequests = new object[]
        {
            new { ids = new[] { video.Id }, tagIds = new[] { tag.Id }, customFields = new Dictionary<string, object> { [$"missing_{suffix}"] = "x" } },
            new { ids = new[] { video.Id }, tagIds = new[] { tag.Id }, customFields = new Dictionary<string, object> { [performerOnlyKey] = "x" } },
            new { ids = new[] { video.Id }, tagIds = new[] { tag.Id }, customFields = new Dictionary<string, object> { [absentKey] = new[] { "not-a-tag-id" } } },
            new { ids = new[] { video.Id }, tagIds = new[] { tag.Id }, customFields = new Dictionary<string, object> { [absentKey] = new[] { tag.Id } }, clearFields = new[] { $"customFields.{absentKey}" } },
        };
        foreach (var request in invalidRequests)
            await AsUser().AssertResponseAsync(HttpMethod.Post, "/api/videos/bulk", HttpStatusCode.BadRequest, request, ct);

        var after = await AsUser().GetVideoByIdAsync(video.Id, ct);
        after.Tags.Should().BeEmpty();
        TagIds(after, absentKey).Should().BeEmpty();
        after.UpdatedAt.Should().Be(video.UpdatedAt);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/videos/bulk")]
    public async Task GivenVideosWithAndWithoutTheValue_WhenBulkAddRuns_ThenUpdatedAtChangesOnlyWhereValuesChanged()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var absentKey = await CreateTagFieldAsync($"absent_{suffix}", ct);
        var tag = await AsUser().CreateTagAsync($"Field tag {suffix}", ct);
        var alreadySet = await AsUser().CreateVideoAsync(new VideoBuilder()
            .WithTitle($"Already set {suffix}")
            .WithCustomField(absentKey, new[] { tag.Id })
            .Build(), ct);
        var missing = await AsUser().CreateVideoAsync($"Missing {suffix}", ct);
        alreadySet = await AsUser().GetVideoByIdAsync(alreadySet.Id, ct);
        missing = await AsUser().GetVideoByIdAsync(missing.Id, ct);

        await AsUser().BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = [alreadySet.Id, missing.Id],
            CustomFields = new() { [absentKey] = new[] { tag.Id } },
            CustomFieldMode = BulkUpdateMode.Add,
        }, ct);

        var alreadySetAfter = await AsUser().GetVideoByIdAsync(alreadySet.Id, ct);
        var missingAfter = await AsUser().GetVideoByIdAsync(missing.Id, ct);
        alreadySetAfter.UpdatedAt.Should().Be(alreadySet.UpdatedAt);
        DateTime.Parse(missingAfter.UpdatedAt).Should().BeAfter(DateTime.Parse(missing.UpdatedAt));
        TagIds(missingAfter, absentKey).Should().Equal(tag.Id);
    }

    private async Task<string> CreateTagFieldAsync(string key, CancellationToken ct)
    {
        var definition = await AsUser().CreateCustomFieldDefinitionAsync(new CustomFieldDefinitionCreateDto
        {
            Key = key,
            Label = key,
            Type = CustomFieldTypes.Tag,
            EntityTypes = [CustomFieldEntityTypes.Video],
            IsMultiValue = true,
        }, ct);
        return definition.Key;
    }

    private async Task<string> CreateTextFieldAsync(string key, CancellationToken ct, string entityType = CustomFieldEntityTypes.Video)
    {
        var definition = await AsUser().CreateCustomFieldDefinitionAsync(new CustomFieldDefinitionCreateDto
        {
            Key = key,
            Label = key,
            Type = CustomFieldTypes.Text,
            EntityTypes = [entityType],
        }, ct);
        return definition.Key;
    }

    private Task<VideoDto[]> GetVideosAsync(IEnumerable<int> ids, CancellationToken ct)
        => Task.WhenAll(ids.Select(id => AsUser().GetVideoByIdAsync(id, ct)));

    private static int[] TagIds(VideoDto video, string key)
        => video.CustomFields != null
            && video.CustomFields.TryGetValue(key, out var raw)
            && raw is JsonElement { ValueKind: JsonValueKind.Array } array
                ? array.EnumerateArray().Select(item => item.GetInt32()).ToArray()
                : [];

    private static string? Text(VideoDto video, string key)
        => video.CustomFields != null && video.CustomFields.TryGetValue(key, out var raw) && raw is JsonElement element
            ? element.GetString()
            : null;
}
