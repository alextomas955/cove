using Cove.ApiTests.Builders;
using Cove.ApiTests.Infrastructure;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;

namespace Cove.ApiTests.Tests.Entities.Faces;

public sealed class FaceCreationAndReadApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/faces/find")]
    public async Task GivenLinkedAndUnlinkedFaces_WhenFoundByBodyFilter_ThenOnlyMatchingFacesAreReturned()
    {
        // Arrange
        var suffix = Guid.NewGuid().ToString("N");
        var performer = await AsUser().CreatePerformerAsync(new PerformerBuilder().Build(), TestContext.Current.CancellationToken);
        var first = await AsUser().CreateFaceAsync(new FaceCreateDto($"Body find linked a {suffix}", performer.Id, false, null), TestContext.Current.CancellationToken);
        var second = await AsUser().CreateFaceAsync(new FaceCreateDto($"Body find linked b {suffix}", performer.Id, false, null), TestContext.Current.CancellationToken);
        var unlinked = await AsUser().CreateFaceAsync(new FaceCreateDto($"Body find unlinked {suffix}", null, false, null), TestContext.Current.CancellationToken);
        var request = new FilteredQueryRequest<FaceFilter>
        {
            ObjectFilter = new FaceFilter
            {
                LabelCriterion = new StringCriterion { Modifier = CriterionModifier.Includes, Value = suffix },
                LinkedCriterion = new BoolCriterion { Value = true },
            },
        };

        // Act
        var result = await AsUser(ApiTestUsers.Eva).FindFacesAsync(request, TestContext.Current.CancellationToken);

        // Assert
        result.TotalCount.Should().Be(2);
        result.Items.Select(face => face.Id).Should().BeEquivalentTo([first.Id, second.Id]);
        result.Items.Should().NotContain(face => face.Id == unlinked.Id);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/faces")]
    [CoversEndpoint("GET", "/api/faces/{id:int}")]
    public async Task GivenFaceMetadata_WhenMemberCreatesAndReadsFace_ThenMetadataIsPersisted()
    {
        // Arrange
        var performer = await AsUser().CreatePerformerAsync(new PerformerBuilder().Build(), TestContext.Current.CancellationToken);
        var request = new FaceCreateDto(
            Label: "  Profile candidate  ",
            PerformerId: performer.Id,
            Ignored: false,
            PrimarySourceKey: "  detector.primary  ");

        // Act
        var created = await AsUser(ApiTestUsers.Eva).CreateFaceAsync(request, TestContext.Current.CancellationToken);
        var retrieved = await AsUser(ApiTestUsers.Eva).GetFaceByIdAsync(created.Id, TestContext.Current.CancellationToken);

        // Assert
        created.Id.Should().BePositive();
        retrieved.Id.Should().Be(created.Id);
        retrieved.Label.Should().Be("Profile candidate");
        retrieved.PerformerId.Should().Be(performer.Id);
        retrieved.PerformerName.Should().Be(performer.Name);
        retrieved.Ignored.Should().BeFalse();
        retrieved.PrimarySourceKey.Should().Be("detector.primary");
        retrieved.DetectionCount.Should().Be(0);
        retrieved.AppearanceCount.Should().Be(0);
    }

    [Fact]
    public async Task GivenMissingPerformer_WhenFaceIsCreated_ThenValidationProblemIsReturned()
    {
        // Arrange
        var request = new FaceCreateDto(
            Label: "Unresolved candidate",
            PerformerId: int.MaxValue,
            Ignored: false,
            PrimarySourceKey: null);

        // Act
        var action = () => AsUser(ApiTestUsers.Eva).CreateFaceAsync(request);

        // Assert
        await action.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*returned 400 (BadRequest)*");
    }

    [Fact]
    public async Task GivenMissingFace_WhenMemberReadsIt_ThenNotFoundIsReturned()
    {
        // Arrange
        const int missingId = int.MaxValue;

        // Act
        var action = () => AsUser(ApiTestUsers.Eva).GetFaceByIdAsync(missingId);

        // Assert
        await action.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*returned 404 (NotFound)*");
    }
}
