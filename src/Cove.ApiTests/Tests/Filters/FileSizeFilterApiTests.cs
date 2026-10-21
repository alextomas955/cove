using Cove.ApiTests.Infrastructure;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;

namespace Cove.ApiTests.Tests.Filters;

public sealed class FileSizeFilterApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/videos/find")]
    public async Task GivenVideosWithDifferentFileSizes_WhenFilteredByFileSize_ThenTheLargestFileIsCompared()
    {
        var owner = AsUser();
        var small = await owner.CreateVideoAsync($"File size small {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        var medium = await owner.CreateVideoAsync($"File size medium {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        var large = await owner.CreateVideoAsync($"File size large {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        await AsDbUser().AttachVideoFileAsync(small.Id, duration: 10, size: 1_000, cancellationToken: TestContext.Current.CancellationToken);
        await AsDbUser().AttachVideoFileAsync(medium.Id, duration: 10, size: 2_500, cancellationToken: TestContext.Current.CancellationToken);
        // A small secondary file must not hide the larger one: the criterion matches Video.MaxFileSize.
        await AsDbUser().AttachVideoFileAsync(large.Id, duration: 10, size: 500, cancellationToken: TestContext.Current.CancellationToken);
        await AsDbUser().AttachVideoFileAsync(large.Id, duration: 10, size: 9_000, cancellationToken: TestContext.Current.CancellationToken);
        // Video files routinely pass 2 GiB, beyond what a 32-bit criterion could express.
        var huge = await owner.CreateVideoAsync($"File size huge {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        await AsDbUser().AttachVideoFileAsync(huge.Id, duration: 10, size: 5_000_000_000, cancellationToken: TestContext.Current.CancellationToken);
        int[] ids = [small.Id, medium.Id, large.Id, huge.Id];

        var cases = new[]
        {
            new SizeCase(CriterionModifier.GreaterThan, 2_000, null, [medium.Id, large.Id, huge.Id]),
            new SizeCase(CriterionModifier.LessThan, 2_500, null, [small.Id]),
            new SizeCase(CriterionModifier.Between, 1_000, 2_500, [small.Id, medium.Id]),
            new SizeCase(CriterionModifier.NotBetween, 1_000, 2_500, [large.Id, huge.Id]),
            new SizeCase(CriterionModifier.Equals, 9_000, null, [large.Id]),
            new SizeCase(CriterionModifier.GreaterThan, 4_000_000_000, null, [huge.Id]),
            new SizeCase(CriterionModifier.LessThan, 4_000_000_000, null, [small.Id, medium.Id, large.Id]),
            new SizeCase(CriterionModifier.Between, 4_000_000_000, 6_000_000_000, [huge.Id]),
        };

        foreach (var testCase in cases)
        {
            var result = await owner.FindVideosAsync(new FilteredQueryRequest<VideoFilter>
            {
                ObjectFilter = new VideoFilter { Ids = [.. ids], FileSizeCriterion = testCase.ToCriterion() },
                FindFilter = new FindFilter { PerPage = 20 },
            }, TestContext.Current.CancellationToken);

            result.Items.Select(video => video.Id).Should().BeEquivalentTo(testCase.ExpectedIds, testCase.Modifier.ToString());
        }
    }

    [Fact]
    [CoversEndpoint("POST", "/api/images/find")]
    public async Task GivenImagesWithDifferentFileSizes_WhenFilteredByFileSize_ThenMatchingImagesAreReturned()
    {
        var owner = AsUser();
        var small = await owner.CreateImageAsync($"File size image small {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        var medium = await owner.CreateImageAsync($"File size image medium {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        var large = await owner.CreateImageAsync($"File size image large {Guid.NewGuid():N}", TestContext.Current.CancellationToken);
        await AsDbUser().AttachImageFileAsync(small.Id, 1_000, TestContext.Current.CancellationToken);
        await AsDbUser().AttachImageFileAsync(medium.Id, 2_500, TestContext.Current.CancellationToken);
        await AsDbUser().AttachImageFileAsync(large.Id, 9_000, TestContext.Current.CancellationToken);
        int[] ids = [small.Id, medium.Id, large.Id];

        var cases = new[]
        {
            new SizeCase(CriterionModifier.GreaterThan, 2_000, null, [medium.Id, large.Id]),
            new SizeCase(CriterionModifier.LessThan, 2_500, null, [small.Id]),
            new SizeCase(CriterionModifier.Between, 1_000, 2_500, [small.Id, medium.Id]),
            new SizeCase(CriterionModifier.NotEquals, 2_500, null, [small.Id, large.Id]),
        };

        foreach (var testCase in cases)
        {
            var result = await owner.FindImagesAsync(new FilteredQueryRequest<ImageFilter>
            {
                ObjectFilter = new ImageFilter { Ids = [.. ids], FileSizeCriterion = testCase.ToCriterion() },
                FindFilter = new FindFilter { PerPage = 20 },
            }, TestContext.Current.CancellationToken);

            result.Items.Select(image => image.Id).Should().BeEquivalentTo(testCase.ExpectedIds, testCase.Modifier.ToString());
        }
    }

    private sealed record SizeCase(CriterionModifier Modifier, long Value, long? Value2, int[] ExpectedIds)
    {
        public LongCriterion ToCriterion() => new() { Modifier = Modifier, Value = Value, Value2 = Value2 };
    }
}
