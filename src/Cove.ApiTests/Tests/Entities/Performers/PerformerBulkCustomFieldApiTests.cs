using System.Text.Json;
using Cove.ApiTests.Builders;
using Cove.ApiTests.Infrastructure;
using Cove.Core.DTOs;
using Cove.Core.Entities;

namespace Cove.ApiTests.Tests.Entities.Performers;

public sealed class PerformerBulkCustomFieldApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/performers/bulk")]
    public async Task GivenMultiValueTagField_WhenBulkAddRuns_ThenSelectedPerformersGainTheValue()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var key = await CreateTagFieldAsync($"absent_{suffix}", ct);
        var tags = await Task.WhenAll(Enumerable.Range(1, 2).Select(index => AsUser().CreateTagAsync($"Field tag {index} {suffix}", ct)));
        var seeded = await AsUser().CreatePerformerAsync(new PerformerBuilder()
            .WithName($"Seeded {suffix}")
            .WithCustomField(key, new[] { tags[0].Id })
            .Build(), ct);
        var empty = await AsUser().CreatePerformerAsync(new PerformerBuilder().WithName($"Empty {suffix}").Build(), ct);
        var control = await AsUser().CreatePerformerAsync(new PerformerBuilder().WithName($"Control {suffix}").Build(), ct);

        await AsUser().BulkUpdatePerformersAsync(new BulkPerformerUpdateDto
        {
            Ids = [seeded.Id, empty.Id],
            CustomFields = new() { [key] = new[] { tags[1].Id } },
            CustomFieldMode = BulkUpdateMode.Add,
        }, ct);

        TagIds(await AsUser().GetPerformerByIdAsync(seeded.Id, ct), key).Should().Equal(tags[0].Id, tags[1].Id);
        TagIds(await AsUser().GetPerformerByIdAsync(empty.Id, ct), key).Should().Equal(tags[1].Id);
        TagIds(await AsUser().GetPerformerByIdAsync(control.Id, ct), key).Should().BeEmpty();
    }

    [Fact]
    [CoversEndpoint("POST", "/api/performers/bulk")]
    public async Task GivenFieldValues_WhenClearFieldsNamesACustomField_ThenOnlySelectedPerformersLoseIt()
    {
        var ct = TestContext.Current.CancellationToken;
        var suffix = Guid.NewGuid().ToString("N");
        var key = await CreateTagFieldAsync($"absent_{suffix}", ct);
        var tag = await AsUser().CreateTagAsync($"Field tag {suffix}", ct);
        var cleared = await AsUser().CreatePerformerAsync(new PerformerBuilder()
            .WithName($"Cleared {suffix}")
            .WithCustomField(key, new[] { tag.Id })
            .Build(), ct);
        var control = await AsUser().CreatePerformerAsync(new PerformerBuilder()
            .WithName($"Control {suffix}")
            .WithCustomField(key, new[] { tag.Id })
            .Build(), ct);

        await AsUser().BulkUpdatePerformersAsync(new BulkPerformerUpdateDto
        {
            Ids = [cleared.Id],
            ClearFields = [$"customFields.{key}"],
        }, ct);

        TagIds(await AsUser().GetPerformerByIdAsync(cleared.Id, ct), key).Should().BeEmpty();
        TagIds(await AsUser().GetPerformerByIdAsync(control.Id, ct), key).Should().Equal(tag.Id);
    }

    private async Task<string> CreateTagFieldAsync(string key, CancellationToken ct)
    {
        var definition = await AsUser().CreateCustomFieldDefinitionAsync(new CustomFieldDefinitionCreateDto
        {
            Key = key,
            Label = key,
            Type = CustomFieldTypes.Tag,
            EntityTypes = [CustomFieldEntityTypes.Performer],
            IsMultiValue = true,
        }, ct);
        return definition.Key;
    }

    private static int[] TagIds(PerformerDto performer, string key)
        => performer.CustomFields != null
            && performer.CustomFields.TryGetValue(key, out var raw)
            && raw is JsonElement { ValueKind: JsonValueKind.Array } array
                ? array.EnumerateArray().Select(item => item.GetInt32()).ToArray()
                : [];
}
