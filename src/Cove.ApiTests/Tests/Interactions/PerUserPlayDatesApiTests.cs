using Cove.ApiTests.Infrastructure;

namespace Cove.ApiTests.Tests.Interactions;

public sealed class PerUserPlayDatesApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/videos/{id:int}/play")]
    [CoversEndpoint("DELETE", "/api/videos/{id:int}/play")]
    [CoversEndpoint("POST", "/api/videos/{id:int}/play/reset")]
    public async Task GivenMembersPlayAVideo_WhenOneRemovesAndResetsPlays_ThenOnlyTheirOwnDatesChange()
    {
        // Arrange
        var video = await AsUser().CreateVideoAsync($"Played video {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        var eva = AsUser(ApiTestUsers.Eva);
        var anthony = AsUser(ApiTestUsers.Anthony);
        await eva.RecordVideoPlayAsync(video, TestContext.Current.CancellationToken);
        await eva.RecordVideoPlayAsync(video, TestContext.Current.CancellationToken);
        await anthony.RecordVideoPlayAsync(video, TestContext.Current.CancellationToken);

        // Act
        var evaPlayed = await eva.GetVideoHistoryAsync(video, TestContext.Current.CancellationToken);
        var anthonyPlayed = await anthony.GetVideoHistoryAsync(video, TestContext.Current.CancellationToken);
        await eva.DeleteVideoPlayAsync(video, TestContext.Current.CancellationToken);
        var evaAfterRemove = await eva.GetVideoHistoryAsync(video, TestContext.Current.CancellationToken);
        await eva.ResetVideoPlayAsync(video, TestContext.Current.CancellationToken);
        var evaAfterReset = await eva.GetVideoHistoryAsync(video, TestContext.Current.CancellationToken);
        var anthonyAfterEva = await anthony.GetVideoHistoryAsync(video, TestContext.Current.CancellationToken);

        // Assert
        evaPlayed.PlayHistory.Should().HaveCount(2);
        anthonyPlayed.PlayHistory.Should().ContainSingle();
        evaAfterRemove.PlayHistory.Should().Equal(evaPlayed.PlayHistory.Skip(1));
        evaAfterReset.PlayHistory.Should().BeEmpty();
        anthonyAfterEva.PlayHistory.Should().Equal(anthonyPlayed.PlayHistory);
        (await eva.GetVideoEngagementAsync(video, TestContext.Current.CancellationToken)).PlayCount.Should().Be(0);
        (await anthony.GetVideoEngagementAsync(video, TestContext.Current.CancellationToken)).PlayCount.Should().Be(1);
    }
}
