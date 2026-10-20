using System.Globalization;
using Cove.ApiTests.Builders;
using Cove.ApiTests.Infrastructure;
using Cove.Core.DTOs;
using Cove.Core.Entities;

namespace Cove.ApiTests.Tests.Entities;

/// <summary>
/// Adding or removing a tag application changes the host it is applied to, so the host's Updated
/// date has to move (#720). Each host is backdated first so the assertions do not depend on clock
/// resolution between requests.
/// </summary>
public sealed class TagApplicationHostUpdatedAtApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    private static readonly DateTime Backdated = new(2001, 2, 3, 4, 5, 6, DateTimeKind.Utc);

    [Fact]
    [CoversEndpoint("POST", "/api/tagapplications")]
    [CoversEndpoint("DELETE", "/api/tagapplications/{id:int}")]
    [CoversEndpoint("DELETE", "/api/tagapplications/host/{hosttype}/{hostid:int}/tag/{tagid:int}")]
    public async Task GivenVideo_WhenTagApplicationsAreAddedAndRemoved_ThenVideoUpdatedAtAdvancesOnlyOnChange()
    {
        var ct = TestContext.Current.CancellationToken;
        var owner = AsUser();
        var suffix = Guid.NewGuid().ToString("N");
        var tag = await owner.CreateTagAsync($"Occurrence tag {suffix}", ct);
        var performer = await owner.CreatePerformerAsync(new PerformerBuilder().WithName($"Occurrence performer {suffix}").Build(), ct);
        var video = await owner.CreateVideoAsync(new VideoBuilder().WithTitle($"Occurrence host {suffix}").WithPerformers([performer]).Build(), ct);
        var control = await owner.CreateVideoAsync($"Occurrence control {suffix}", ct);
        await BackdateAsync<Video>(control.Id, ct);

        var occurrence = new TagApplicationCreateDto("video", video.Id, tag.Id, "user", "performer", performer.Id);
        await BackdateAsync<Video>(video.Id, ct);
        var created = await owner.CreateTagApplicationAsync(occurrence, ct);
        await AssertVideoUpdatedAtAdvancedAsync(video.Id, ct);

        // Re-sending an application the video already has changes nothing about the video.
        await BackdateAsync<Video>(video.Id, ct);
        (await owner.CreateTagApplicationAsync(occurrence, ct)).Id.Should().Be(created.Id);
        Timestamp((await owner.GetVideoByIdAsync(video.Id, ct)).UpdatedAt).Should().Be(Backdated);

        await owner.DeleteTagApplicationAsync(created.Id, ct);
        await AssertVideoUpdatedAtAdvancedAsync(video.Id, ct);

        await owner.CreateTagApplicationAsync(new TagApplicationCreateDto("video", video.Id, tag.Id, "ai:detector"), ct);
        await BackdateAsync<Video>(video.Id, ct);
        await owner.DeleteHostTagApplicationsAsync("video", video.Id, tag.Id, ct);
        await AssertVideoUpdatedAtAdvancedAsync(video.Id, ct);

        Timestamp((await owner.GetVideoByIdAsync(control.Id, ct)).UpdatedAt).Should().Be(Backdated);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/tagapplications")]
    [CoversEndpoint("DELETE", "/api/tagapplications/{id:int}")]
    public async Task GivenPerformer_WhenTagApplicationIsAddedAndRemoved_ThenPerformerUpdatedAtAdvances()
    {
        var ct = TestContext.Current.CancellationToken;
        var owner = AsUser();
        var suffix = Guid.NewGuid().ToString("N");
        var tag = await owner.CreateTagAsync($"Performer application tag {suffix}", ct);
        var performer = await owner.CreatePerformerAsync(new PerformerBuilder().WithName($"Performer application host {suffix}").Build(), ct);

        await BackdateAsync<Performer>(performer.Id, ct);
        var created = await owner.CreateTagApplicationAsync(new TagApplicationCreateDto("performer", performer.Id, tag.Id), ct);
        Timestamp((await owner.GetPerformerByIdAsync(performer.Id, ct)).UpdatedAt).Should().BeAfter(Backdated);

        await BackdateAsync<Performer>(performer.Id, ct);
        await owner.DeleteTagApplicationAsync(created.Id, ct);
        var after = await owner.GetPerformerByIdAsync(performer.Id, ct);
        Timestamp(after.UpdatedAt).Should().BeAfter(Backdated);
        after.Name.Should().Be(performer.Name);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/videos/bulk")]
    public async Task GivenVideos_WhenBulkTagEditChangesTheirTags_ThenEveryAffectedVideoUpdatedAtAdvances()
    {
        var ct = TestContext.Current.CancellationToken;
        var owner = AsUser();
        var suffix = Guid.NewGuid().ToString("N");
        var tag = await owner.CreateTagAsync($"Bulk application tag {suffix}", ct);
        var videos = new[]
        {
            await owner.CreateVideoAsync($"Bulk application host A {suffix}", ct),
            await owner.CreateVideoAsync($"Bulk application host B {suffix}", ct),
        };
        foreach (var video in videos)
            await BackdateAsync<Video>(video.Id, ct);

        await owner.BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = videos.Select(video => video.Id).ToList(),
            TagIds = [tag.Id],
            TagMode = BulkUpdateMode.Add,
        }, ct);
        foreach (var video in videos)
            await AssertVideoUpdatedAtAdvancedAsync(video.Id, ct);

        await owner.BulkUpdateVideosAsync(new BulkVideoUpdateDto
        {
            Ids = videos.Select(video => video.Id).ToList(),
            TagIds = [tag.Id],
            TagMode = BulkUpdateMode.Remove,
        }, ct);
        foreach (var video in videos)
            await AssertVideoUpdatedAtAdvancedAsync(video.Id, ct);
    }

    private Task BackdateAsync<TEntity>(int id, CancellationToken ct) where TEntity : BaseEntity
        => AsDbUser().BackdateUpdatedAtAsync<TEntity>(id, Backdated, ct);

    private async Task AssertVideoUpdatedAtAdvancedAsync(int videoId, CancellationToken ct)
    {
        Timestamp((await AsUser().GetVideoByIdAsync(videoId, ct)).UpdatedAt).Should().BeAfter(Backdated);
        await BackdateAsync<Video>(videoId, ct);
    }

    private static DateTime Timestamp(string value)
        => DateTime.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
}
