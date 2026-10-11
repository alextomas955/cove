using System.Net;
using Cove.ApiTests.Infrastructure;

namespace Cove.ApiTests.Tests.Entities.Studios;

public sealed class StudioAliasApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("POST", "/api/studios/{id:int}/aliases")]
    public async Task GivenStudioWithAlias_WhenAnotherAliasIsAdded_ThenBothAliasesAreKept()
    {
        var owner = AsUser();
        var suffix = Guid.NewGuid().ToString("N");
        var studio = await owner.CreateStudioAsync($"Alias Studio {suffix}", TestContext.Current.CancellationToken);
        await owner.AddStudioAliasAsync(studio.Id, $"First Alias {suffix}", TestContext.Current.CancellationToken);

        var updated = await owner.AddStudioAliasAsync(studio.Id, $" Second Alias {suffix} ", TestContext.Current.CancellationToken);
        var repeated = await owner.AddStudioAliasAsync(studio.Id, $"second alias {suffix}", TestContext.Current.CancellationToken);
        var read = await owner.GetStudioByIdAsync(studio.Id, TestContext.Current.CancellationToken);

        updated.Aliases.Should().BeEquivalentTo($"First Alias {suffix}", $"Second Alias {suffix}");
        repeated.Aliases.Should().BeEquivalentTo($"First Alias {suffix}", $"Second Alias {suffix}");
        read.Aliases.Should().BeEquivalentTo($"First Alias {suffix}", $"Second Alias {suffix}");
    }

    [Fact]
    [CoversEndpoint("POST", "/api/studios/{id:int}/aliases")]
    public async Task GivenNameOwnedByAnotherStudio_WhenAddedAsAlias_ThenConflictIsReturned()
    {
        var owner = AsUser();
        var suffix = Guid.NewGuid().ToString("N");
        var studio = await owner.CreateStudioAsync($"Alias Studio {suffix}", TestContext.Current.CancellationToken);
        await owner.CreateStudioAsync($"Other Studio {suffix}", TestContext.Current.CancellationToken);

        var status = await owner.TryAddStudioAliasAsync(studio.Id, $"other studio {suffix}", TestContext.Current.CancellationToken);
        var read = await owner.GetStudioByIdAsync(studio.Id, TestContext.Current.CancellationToken);

        status.Should().Be(HttpStatusCode.Conflict);
        read.Aliases.Should().BeEmpty();
    }

    [Fact]
    [CoversEndpoint("POST", "/api/studios/{id:int}/aliases")]
    public async Task GivenBlankAlias_WhenAdded_ThenBadRequestIsReturned()
    {
        var owner = AsUser();
        var studio = await owner.CreateStudioAsync($"Alias Studio {Guid.NewGuid():N}", TestContext.Current.CancellationToken);

        var status = await owner.TryAddStudioAliasAsync(studio.Id, "   ", TestContext.Current.CancellationToken);

        status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    [CoversEndpoint("POST", "/api/studios/{id:int}/aliases")]
    public async Task GivenMissingStudio_WhenAliasIsAdded_ThenNotFoundIsReturned()
    {
        var status = await AsUser().TryAddStudioAliasAsync(int.MaxValue, "Orphan alias", TestContext.Current.CancellationToken);

        status.Should().Be(HttpStatusCode.NotFound);
    }
}
