using Cove.Plugins;

namespace Cove.Tests;

public class GitHubExtensionRegistryVersionTests
{
    [Theory]
    [InlineData("0.8.1", "0.8.0", true)]
    [InlineData("0.8.0", "0.8.0", false)]
    [InlineData("0.8.10", "0.8.9", true)]
    [InlineData("0.8.1", "0.8.1-dev.20261018143000", true)]
    [InlineData("0.8.1-dev.20261018143000", "0.8.1", false)]
    [InlineData("0.8.1-dev.20261018143000", "0.8.0", true)]
    [InlineData("0.8.10", "0.8.9-dev.20261018143000", true)]
    [InlineData("0.8.1-dev.20261018150000", "0.8.1-dev.20261018143000", true)]
    [InlineData("v1.2.0", "1.1.9", true)]
    [InlineData("1.0.0.1", "1.0.0", true)]
    public void IsNewerVersion_uses_semantic_version_precedence(string candidate, string current, bool expected)
    {
        Assert.Equal(expected, GitHubExtensionRegistry.IsNewerVersion(candidate, current));
    }
}
