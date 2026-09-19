using Cove.Core.DTOs;
using Cove.Plugins;

namespace Cove.Tests;

/// <summary>
/// Width/Height were added to the quality option records as init properties. Extensions compiled
/// before that construct and deconstruct the records with three positional values, so these shapes
/// must not change (see the Compatibility / ABI section of src/Cove.Sdk/README.md).
/// </summary>
public sealed class DownloaderContractCompatibilityTests
{
    [Theory]
    [InlineData(typeof(DownloaderQualityOption))]
    [InlineData(typeof(DownloaderQualityOptionDto))]
    public void QualityOptionRecordsKeepTheirOriginalPositionalShape(Type recordType)
    {
        var constructor = Assert.Single(recordType.GetConstructors(), candidate =>
            candidate.GetParameters().Length == 3);
        Assert.Equal(
            [typeof(string), typeof(string), typeof(string)],
            constructor.GetParameters().Select(parameter => parameter.ParameterType));

        var deconstruct = Assert.Single(recordType.GetMethods(), method => method.Name == "Deconstruct");
        Assert.Equal(3, deconstruct.GetParameters().Length);
    }
}
