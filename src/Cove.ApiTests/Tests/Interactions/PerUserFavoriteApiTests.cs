using Cove.Core.DTOs;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Cove.ApiTests.Builders;
using Cove.ApiTests.Infrastructure;

namespace Cove.ApiTests.Tests.Interactions;

public sealed class PerUserFavoriteApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    public async Task GivenCatalogEntitiesCreatedAsFavorites_WhenMembersRead_ThenOnlyCreatorSeesFavorites()
    {
        // Arrange
        var eva = AsUser(ApiTestUsers.Eva);
        var anthony = AsUser(ApiTestUsers.Anthony);

        // Act
        var performer = await eva.CreatePerformerAsync(new PerformerBuilder().WithName($"Favorite performer {Guid.NewGuid():N}").AsFavorite().Build(), TestContext.Current.CancellationToken);
        var tag = await eva.CreateTagAsync(new TagBuilder().WithName($"Favorite tag {Guid.NewGuid():N}").AsFavorite().Build(), TestContext.Current.CancellationToken);
        var studio = await eva.CreateStudioAsync(FavoriteStudio($"Favorite studio {Guid.NewGuid():N}"), TestContext.Current.CancellationToken);

        // Assert
        performer.Favorite.Should().BeTrue();
        tag.Favorite.Should().BeTrue();
        studio.Favorite.Should().BeTrue();
        await ShouldBeFavoriteForAsync(eva, performer.Id, tag.Id, studio.Id, expected: true);
        await ShouldBeFavoriteForAsync(anthony, performer.Id, tag.Id, studio.Id, expected: false);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/tags/bulk")]
    [CoversEndpoint("POST", "/api/studios/bulk")]
    public async Task GivenCatalogEntities_WhenMemberBulkFavoritesAndUnfavorites_ThenOnlyThatMemberChanges()
    {
        // Arrange
        var (performer, tag, studio) = await CreateCatalogEntitiesAsync();
        var eva = AsUser(ApiTestUsers.Eva);
        var anthony = AsUser(ApiTestUsers.Anthony);
        await anthony.SetEntityFavoriteAsync(AffinityHostType.Performer, performer.Id, isFavorite: true, TestContext.Current.CancellationToken);
        await anthony.SetEntityFavoriteAsync(AffinityHostType.Tag, tag.Id, isFavorite: true, TestContext.Current.CancellationToken);
        await anthony.SetEntityFavoriteAsync(AffinityHostType.Studio, studio.Id, isFavorite: true, TestContext.Current.CancellationToken);

        // Act & Assert
        await eva.BulkUpdatePerformersAsync(new BulkPerformerUpdateDto { Ids = [performer.Id], Favorite = true }, TestContext.Current.CancellationToken);
        await eva.BulkUpdateTagsAsync(new BulkTagUpdateDto { Ids = [tag.Id], Favorite = true }, TestContext.Current.CancellationToken);
        await eva.BulkUpdateStudiosAsync(new BulkStudioUpdateDto { Ids = [studio.Id], Favorite = true }, TestContext.Current.CancellationToken);
        await ShouldBeFavoriteForAsync(eva, performer.Id, tag.Id, studio.Id, expected: true);
        await ShouldBeFavoriteForAsync(AsUser(), performer.Id, tag.Id, studio.Id, expected: false);

        await eva.BulkUpdatePerformersAsync(new BulkPerformerUpdateDto { Ids = [performer.Id], Favorite = false }, TestContext.Current.CancellationToken);
        await eva.BulkUpdateTagsAsync(new BulkTagUpdateDto { Ids = [tag.Id], Favorite = false }, TestContext.Current.CancellationToken);
        await eva.BulkUpdateStudiosAsync(new BulkStudioUpdateDto { Ids = [studio.Id], Favorite = false }, TestContext.Current.CancellationToken);
        await ShouldBeFavoriteForAsync(eva, performer.Id, tag.Id, studio.Id, expected: false);
        await ShouldBeFavoriteForAsync(anthony, performer.Id, tag.Id, studio.Id, expected: true);
    }

    [Fact]
    public async Task GivenCatalogEntities_WhenMemberUpdatesFavorite_ThenOnlyThatMemberSeesFavorites()
    {
        // Arrange
        var (performer, tag, studio) = await CreateCatalogEntitiesAsync();
        var eva = AsUser(ApiTestUsers.Eva);

        // Act
        var updatedPerformer = await eva.UpdatePerformerAsync(performer.Id, new PerformerUpdateDto(
            Name: null, Disambiguation: null, Gender: null, Birthdate: null, DeathDate: null, Ethnicity: null, Country: null,
            EyeColor: null, HairColor: null, HeightCm: null, Weight: null, Measurements: null, FakeTits: null, PenisLength: null,
            Circumcised: null, CareerStart: null, CareerEnd: null, Tattoos: null, Piercings: null, Favorite: true, Rating: null,
            Details: null, Urls: null, Aliases: null, TagIds: null, RemoteIds: null, CustomFields: null), TestContext.Current.CancellationToken);
        var updatedTag = await eva.UpdateTagAsync(tag.Id, new TagUpdateDto(
            Name: null, SortName: null, Description: null, Favorite: true, Aliases: null, ParentIds: null, ChildIds: null,
            CustomFields: null), TestContext.Current.CancellationToken);
        var updatedStudio = await eva.UpdateStudioAsync(studio.Id, new StudioUpdateDto(
            Name: null, ParentId: null, Rating: null, Favorite: true, Details: null, Organized: null, Urls: null, Aliases: null,
            TagIds: null, RemoteIds: null, CustomFields: null), TestContext.Current.CancellationToken);

        // Assert
        updatedPerformer.Favorite.Should().BeTrue();
        updatedTag.Favorite.Should().BeTrue();
        updatedStudio.Favorite.Should().BeTrue();
        await ShouldBeFavoriteForAsync(eva, performer.Id, tag.Id, studio.Id, expected: true);
        await ShouldBeFavoriteForAsync(AsUser(ApiTestUsers.Anthony), performer.Id, tag.Id, studio.Id, expected: false);
    }

    [Fact]
    public async Task GivenMemberFavorites_WhenMembersFilterByFavorite_ThenEachMemberMatchesOwnFavorites()
    {
        // Arrange
        var suffix = Guid.NewGuid().ToString("N");
        var (performer, tag, studio) = await CreateCatalogEntitiesAsync(suffix);
        var eva = AsUser(ApiTestUsers.Eva);
        var anthony = AsUser(ApiTestUsers.Anthony);
        await eva.SetEntityFavoriteAsync(AffinityHostType.Performer, performer.Id, isFavorite: true, TestContext.Current.CancellationToken);
        await eva.SetEntityFavoriteAsync(AffinityHostType.Tag, tag.Id, isFavorite: true, TestContext.Current.CancellationToken);
        await eva.SetEntityFavoriteAsync(AffinityHostType.Studio, studio.Id, isFavorite: true, TestContext.Current.CancellationToken);

        // Act
        var evaPerformers = await eva.FindPerformersAsync(PerformerQuery(suffix, favorite: true), TestContext.Current.CancellationToken);
        var anthonyPerformers = await anthony.FindPerformersAsync(PerformerQuery(suffix, favorite: true), TestContext.Current.CancellationToken);
        var anthonyNonFavoritePerformers = await anthony.FindPerformersAsync(PerformerQuery(suffix, favorite: false), TestContext.Current.CancellationToken);
        var evaTags = await eva.FindTagsAsync(TagQuery(suffix, favorite: true), TestContext.Current.CancellationToken);
        var anthonyTags = await anthony.FindTagsAsync(TagQuery(suffix, favorite: true), TestContext.Current.CancellationToken);
        var evaStudios = await eva.FindStudiosAsync(StudioQuery(suffix, favorite: true), TestContext.Current.CancellationToken);
        var anthonyStudios = await anthony.FindStudiosAsync(StudioQuery(suffix, favorite: true), TestContext.Current.CancellationToken);

        // Assert
        evaPerformers.Items.Should().ContainSingle().Which.Should().Match<PerformerDto>(item => item.Id == performer.Id && item.Favorite);
        anthonyPerformers.Items.Should().BeEmpty();
        anthonyNonFavoritePerformers.Items.Should().ContainSingle().Which.Should().Match<PerformerDto>(item => item.Id == performer.Id && !item.Favorite);
        evaTags.Items.Should().ContainSingle().Which.Should().Match<TagListDto>(item => item.Id == tag.Id && item.Favorite);
        anthonyTags.Items.Should().BeEmpty();
        evaStudios.Items.Should().ContainSingle().Which.Should().Match<StudioDto>(item => item.Id == studio.Id && item.Favorite);
        anthonyStudios.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GivenMemberFavoritePerformer_WhenMembersReadAndFilterVideos_ThenPerformerFavoriteIsPerMember()
    {
        // Arrange
        var performer = await AsUser().CreatePerformerAsync(new PerformerBuilder().WithName($"Video performer {Guid.NewGuid():N}").Build(), TestContext.Current.CancellationToken);
        var video = await AsUser().CreateVideoAsync(new VideoBuilder().WithTitle($"Video {Guid.NewGuid():N}").WithPerformers([performer]).Build(), TestContext.Current.CancellationToken);
        var eva = AsUser(ApiTestUsers.Eva);
        var anthony = AsUser(ApiTestUsers.Anthony);
        await eva.SetEntityFavoriteAsync(AffinityHostType.Performer, performer.Id, isFavorite: true, TestContext.Current.CancellationToken);
        var query = new FilteredQueryRequest<VideoFilter>
        {
            ObjectFilter = new VideoFilter { PerformerFavoriteCriterion = new BoolCriterion { Value = true } },
            FindFilter = new FindFilter { Q = video.Title, PerPage = 10 },
        };

        // Act
        var evaVideo = await eva.GetVideoByIdAsync(video.Id, TestContext.Current.CancellationToken);
        var anthonyVideo = await anthony.GetVideoByIdAsync(video.Id, TestContext.Current.CancellationToken);
        var evaMatches = await eva.FindVideosAsync(query, TestContext.Current.CancellationToken);
        var anthonyMatches = await anthony.FindVideosAsync(query, TestContext.Current.CancellationToken);

        // Assert
        evaVideo.Performers.Should().ContainSingle().Which.Favorite.Should().BeTrue();
        anthonyVideo.Performers.Should().ContainSingle().Which.Favorite.Should().BeFalse();
        evaMatches.Items.Should().ContainSingle().Which.Id.Should().Be(video.Id);
        anthonyMatches.Items.Should().BeEmpty();
    }

    private async Task<(PerformerDto Performer, TagDetailDto Tag, StudioDto Studio)> CreateCatalogEntitiesAsync(string? suffix = null)
    {
        suffix ??= Guid.NewGuid().ToString("N");
        var owner = AsUser();
        var performer = await owner.CreatePerformerAsync(new PerformerBuilder().WithName($"Performer {suffix}").Build(), TestContext.Current.CancellationToken);
        var tag = await owner.CreateTagAsync($"Tag {suffix}", TestContext.Current.CancellationToken);
        var studio = await owner.CreateStudioAsync($"Studio {suffix}", TestContext.Current.CancellationToken);
        return (performer, tag, studio);
    }

    private static async Task ShouldBeFavoriteForAsync(CoveClient user, int performerId, int tagId, int studioId, bool expected)
    {
        (await user.GetPerformerByIdAsync(performerId, TestContext.Current.CancellationToken)).Favorite.Should().Be(expected);
        (await user.GetTagByIdAsync(tagId, TestContext.Current.CancellationToken)).Favorite.Should().Be(expected);
        (await user.GetStudioByIdAsync(studioId, TestContext.Current.CancellationToken)).Favorite.Should().Be(expected);
        (await user.GetEntityEngagementAsync(AffinityHostType.Performer, performerId, TestContext.Current.CancellationToken)).IsFavorite.Should().Be(expected);
        (await user.GetEntityEngagementAsync(AffinityHostType.Tag, tagId, TestContext.Current.CancellationToken)).IsFavorite.Should().Be(expected);
        (await user.GetEntityEngagementAsync(AffinityHostType.Studio, studioId, TestContext.Current.CancellationToken)).IsFavorite.Should().Be(expected);
    }

    private static StudioCreateDto FavoriteStudio(string name)
        => new(Name: name, ParentId: null, Rating: null, Favorite: true, Details: null, Organized: false, Urls: [], Aliases: [], TagIds: []);

    private static FilteredQueryRequest<PerformerFilter> PerformerQuery(string suffix, bool favorite) => new()
    {
        ObjectFilter = new PerformerFilter { FavoriteCriterion = new BoolCriterion { Value = favorite } },
        FindFilter = new FindFilter { Q = suffix, PerPage = 10 },
    };

    private static FilteredQueryRequest<TagFilter> TagQuery(string suffix, bool favorite) => new()
    {
        ObjectFilter = new TagFilter { FavoriteCriterion = new BoolCriterion { Value = favorite } },
        FindFilter = new FindFilter { Q = suffix, PerPage = 10 },
    };

    private static FilteredQueryRequest<StudioFilter> StudioQuery(string suffix, bool favorite) => new()
    {
        ObjectFilter = new StudioFilter { FavoriteCriterion = new BoolCriterion { Value = favorite } },
        FindFilter = new FindFilter { Q = suffix, PerPage = 10 },
    };
}
