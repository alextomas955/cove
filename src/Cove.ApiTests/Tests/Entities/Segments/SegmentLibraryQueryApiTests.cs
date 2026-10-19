using Cove.ApiTests.Infrastructure;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;

namespace Cove.ApiTests.Tests.Entities.Segments;

public sealed class SegmentLibraryQueryApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/segments/find")]
    public async Task GivenSegmentsFromOneSource_WhenFoundByBodyFilter_ThenOnlyTheSelectedSegmentsAreReturned()
    {
        var owner = AsUser();
        var sourceKey = $"api-test.segment-find.{Guid.NewGuid():N}";
        var video = await owner.CreateVideoAsync($"Segment find host {sourceKey}", TestContext.Current.CancellationToken);
        var first = await owner.CreateVideoSegmentAsync(video, CreateSegment(sourceKey, 0, 2), TestContext.Current.CancellationToken);
        var second = await owner.CreateVideoSegmentAsync(video, CreateSegment(sourceKey, 5, 8.5), TestContext.Current.CancellationToken);
        var excluded = await owner.CreateVideoSegmentAsync(video, CreateSegment(sourceKey, 10, 11), TestContext.Current.CancellationToken);
        var request = new FilteredQueryRequest<SegmentFilter>
        {
            Ids = [first.Id, second.Id],
            ObjectFilter = new SegmentFilter { SourceKey = sourceKey },
        };

        var result = await AsUser(ApiTestUsers.Eva).FindSegmentsAsync(request, TestContext.Current.CancellationToken);

        result.TotalCount.Should().Be(2);
        result.Items.Select(item => item.Id).Should().BeEquivalentTo([first.Id, second.Id]);
        result.Items.Should().NotContain(item => item.Id == excluded.Id);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/segments/aggregate")]
    public async Task GivenSelectedSegments_WhenAggregated_ThenCountAndDurationAreScopedToSelection()
    {
        var owner = AsUser();
        var sourceKey = $"api-test.segment-aggregate.{Guid.NewGuid():N}";
        var video = await owner.CreateVideoAsync($"Segment aggregate host {sourceKey}", TestContext.Current.CancellationToken);
        var first = await owner.CreateVideoSegmentAsync(video, CreateSegment(sourceKey, 0, 2), TestContext.Current.CancellationToken);
        var second = await owner.CreateVideoSegmentAsync(video, CreateSegment(sourceKey, 5, 8.5), TestContext.Current.CancellationToken);
        await owner.CreateVideoSegmentAsync(video, CreateSegment(sourceKey, 10, 20), TestContext.Current.CancellationToken);
        var request = new FilteredQueryRequest<SegmentFilter> { Ids = [first.Id, second.Id] };

        var aggregate = await AsUser(ApiTestUsers.Eva).AggregateSegmentsAsync(request, TestContext.Current.CancellationToken);

        aggregate.Should().Be(new SegmentAggregate(Count: 2, Duration: 5.5));
    }

    private static SegmentCreateDto CreateSegment(string sourceKey, double startSec, double endSec)
        => new(startSec, endSec, null, "chapter", null, null, sourceKey, null, null, $"{sourceKey} {startSec}", null);
}
