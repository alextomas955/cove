using Cove.ApiTests.Infrastructure;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;

namespace Cove.ApiTests.Tests.Entities.Segments;

public sealed class SegmentLibraryQueryApiTests(ITestOutputHelper output, CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/segments/find")]
    public async Task GivenMatchingSegments_WhenFilteredAndPaged_ThenOnlyTheRequestedPageIsReturned()
    {
        // Arrange
        var suffix = Guid.NewGuid().ToString("N");
        var video = await AsUser().CreateVideoAsync($"Segment library find {suffix}", TestContext.Current.CancellationToken);
        var first = await AsUser().CreateVideoSegmentAsync(video, Segment(1, 3, $"library-find-{suffix}", "First"), TestContext.Current.CancellationToken);
        var second = await AsUser().CreateVideoSegmentAsync(video, Segment(5, 8, $"library-find-{suffix}", "Second"), TestContext.Current.CancellationToken);
        await AsUser().CreateVideoSegmentAsync(video, Segment(10, 12, $"library-excluded-{suffix}", "Excluded"), TestContext.Current.CancellationToken);
        var request = new FilteredQueryRequest<SegmentFilter>
        {
            ObjectFilter = new SegmentFilter { VideoIds = [video.Id], SourceKey = $"library-find-{suffix}" },
            FindFilter = new FindFilter { Page = 2, PerPage = 1, Sort = "start_sec" },
        };

        // Act
        var result = await AsUser(ApiTestUsers.Eva).FindSegmentsAsync(request, TestContext.Current.CancellationToken);

        // Assert
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(2);
        result.PerPage.Should().Be(1);
        result.Items.Should().ContainSingle().Which.Id.Should().Be(second.Id);
        result.Items.Should().NotContain(candidate => candidate.Id == first.Id);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/segments/aggregate")]
    public async Task GivenSelectedSegments_WhenAggregated_ThenTotalsAreScopedToSelection()
    {
        // Arrange
        var suffix = Guid.NewGuid().ToString("N");
        var video = await AsUser().CreateVideoAsync($"Segment library aggregate {suffix}", TestContext.Current.CancellationToken);
        var first = await AsUser().CreateVideoSegmentAsync(video, Segment(2, 4.5, $"library-aggregate-{suffix}", "First"), TestContext.Current.CancellationToken);
        var second = await AsUser().CreateVideoSegmentAsync(video, Segment(10, 17.25, $"library-aggregate-{suffix}", "Second"), TestContext.Current.CancellationToken);
        await AsUser().CreateVideoSegmentAsync(video, Segment(20, 80, $"library-aggregate-{suffix}", "Excluded"), TestContext.Current.CancellationToken);
        var request = new FilteredQueryRequest<SegmentFilter> { Ids = [first.Id, second.Id] };

        // Act
        var aggregate = await AsUser(ApiTestUsers.Eva).AggregateSegmentsAsync(request, TestContext.Current.CancellationToken);

        // Assert
        aggregate.Should().Be(new SegmentAggregate(Count: 2, Duration: 9.75));
    }

    private static SegmentCreateDto Segment(double start, double end, string sourceKey, string title)
        => new(start, end, null, "chapter", null, null, sourceKey, null, .8f, title, null);
}
