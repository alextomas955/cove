using Cove.ApiTests.Infrastructure;
using Cove.Core.Auth;
using Cove.Core.DTOs;
using Cove.Core.Entities.Auth;

namespace Cove.ApiTests.Tests.Entities.Videos;

/// <summary>
/// The tagger asks whether a candidate cover is the picture a video already carries. The verdict is
/// advisory — nothing is written by asking — but it reaches out to a URL the caller supplies, so the
/// endpoint is gated on write access rather than read.
/// </summary>
public sealed class VideoCoverComparisonApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/videos/{id:int}/cover-comparison")]
    public async Task GivenVideoCovers_WhenComparisonIsRequested_ThenItIsGatedOnWriteAndNeverWrites()
    {
        var owner = AsUser();
        var suffix = Guid.NewGuid().ToString("N");
        var video = await owner.CreateVideoAsync($"Cover comparison video {suffix}", TestContext.Current.CancellationToken);
        const string candidateUrl = "https://metadata.invalid/cover.jpg";

        var viewerUsername = $"cover-comparison-viewer-{suffix}";
        const string password = "Cover comparison permissions 123!";
        await owner.CreateUserAsync(new CreateUserRequest(viewerUsername, password, Roles: [BuiltinRoles.Viewer]), TestContext.Current.CancellationToken);
        using var viewerSession = await owner.CreateAuthSessionAsync(viewerUsername, password, TestContext.Current.CancellationToken);

        // Reading a video is not enough: the comparison fetches a caller-supplied URL and reports what
        // came back, which a read-only caller has no business asking the server to do.
        var forbidden = () => viewerSession.Client.CompareVideoCoverAsync(video, candidateUrl);
        await forbidden.Should().ThrowAsync<InvalidOperationException>().WithMessage("*returned 403 (Forbidden)*");

        var missing = () => owner.CompareMissingVideoCoverAsync(int.MaxValue, candidateUrl);
        await missing.Should().ThrowAsync<InvalidOperationException>().WithMessage("*returned 404 (NotFound)*");

        // A video with no cover of its own has nothing to compare against, and the tagger's existing
        // "replace the generated frame" default stands. This answers without any outbound request.
        var withoutCover = await owner.CompareVideoCoverAsync(video, candidateUrl, TestContext.Current.CancellationToken);
        withoutCover.Verdict.Should().Be(VideoCoverComparisonVerdicts.Unavailable);
        withoutCover.Distance.Should().BeNull();
        withoutCover.Current.Should().BeNull();
        withoutCover.Candidate.Should().BeNull();

        await owner.UploadVideoImageAsync(video, ApiTestImages.RedPixelPng(), cancellationToken: TestContext.Current.CancellationToken);

        // With a cover set, an unreachable candidate leaves the review on its URL-based behaviour
        // rather than inventing a verdict.
        var unreachable = await owner.CompareVideoCoverAsync(video, candidateUrl, TestContext.Current.CancellationToken);
        unreachable.Verdict.Should().Be(VideoCoverComparisonVerdicts.Unavailable);

        var blankUrl = await owner.CompareVideoCoverAsync(video, string.Empty, TestContext.Current.CancellationToken);
        blankUrl.Verdict.Should().Be(VideoCoverComparisonVerdicts.Unavailable);

        // Asking never changes the video: the cover it had before the comparisons is the cover it has.
        var afterComparisons = await owner.GetVideoByIdAsync(video.Id, TestContext.Current.CancellationToken);
        afterComparisons.ImagePath.Should().NotBeNull();
        var storedCover = await owner.GetVideoImageAsync(video, cancellationToken: TestContext.Current.CancellationToken);
        storedCover.Content.Should().Equal(ApiTestImages.RedPixelPng());
    }
}
