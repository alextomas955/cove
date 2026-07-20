using Cove.Api.Services;
using Cove.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace Cove.Tests.Integration;

/// <summary>
/// Verifies that the host-service forwarding registrations are live in the composed application: after
/// real startup, extensions (which can bind only <c>Cove.Core</c> types) can resolve each host service
/// through its <c>Cove.Core</c> interface and receive the concrete <c>Cove.Api</c> implementation.
/// </summary>
public sealed class HostServiceRegistrationTests
{
    [Fact]
    public void HostServices_ResolveThroughTheirCoreInterfaces()
    {
        using var factory = new CoveWebApplicationFactory();
        using var scope = factory.Services.CreateScope();

        var metadataServer = scope.ServiceProvider.GetService<IMetadataServerService>();
        var performerImporter = scope.ServiceProvider.GetService<IReferencePerformerImporter>();

        Assert.IsType<MetadataServerService>(metadataServer);
        Assert.IsType<ReferencePerformerImporter>(performerImporter);
    }
}
