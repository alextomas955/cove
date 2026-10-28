using System.Security.Cryptography;
using Cove.Data;

namespace Cove.Tests;

public sealed class PostgresPayloadTests : IDisposable
{
    private const string Manifest = """
        {
          "schema": 1,
          "postgresMajor": "18",
          "postgresVersion": "18.3",
          "releaseTag": "postgres-payload-v18.3",
          "assets": {
            "win-x64": {
              "fileName": "postgres-18.3-win-x64.tar.gz",
              "url": "https://github.com/yourcove/cove/releases/download/postgres-payload-v18.3/postgres-18.3-win-x64.tar.gz",
              "sha256": "aa",
              "sizeBytes": 1
            },
            "linux-x64": {
              "fileName": "postgres-18.3-linux-x64.tar.gz",
              "url": "https://github.com/yourcove/cove/releases/download/postgres-payload-v18.3/postgres-18.3-linux-x64.tar.gz",
              "sha256": "bb"
            }
          }
        }
        """;

    private readonly string _root = Path.Combine(Path.GetTempPath(), $"cove payload test {Guid.NewGuid():N}");

    [Fact]
    public void SelectsThisPlatformsAsset()
    {
        var asset = PostgresManagerService.SelectPayloadAsset(Manifest, "linux-x64", "18", "manifest");
        Assert.Equal("postgres-18.3-linux-x64.tar.gz", asset.FileName);
        Assert.EndsWith("/postgres-18.3-linux-x64.tar.gz", asset.Url);
        Assert.Equal("bb", asset.Sha256);
    }

    [Fact]
    public void MissingRuntimeListsTheAvailableOnes()
    {
        var error = Assert.Throws<InvalidOperationException>(() => PostgresManagerService.SelectPayloadAsset(Manifest, "linux-arm64", "18", "https://example/manifest.json"));
        Assert.Contains("linux-arm64", error.Message);
        Assert.Contains("win-x64, linux-x64", error.Message);
        Assert.Contains("https://example/manifest.json", error.Message);
        Assert.Contains("Cove__Postgres__Managed=false", error.Message);
    }

    [Fact]
    public void RejectsAManifestForAnotherMajor()
    {
        var error = Assert.Throws<InvalidOperationException>(() => PostgresManagerService.SelectPayloadAsset(Manifest, "win-x64", "19", "manifest"));
        Assert.Contains("PostgreSQL 18", error.Message);
        Assert.Contains("PostgreSQL 19", error.Message);
    }

    [Theory]
    [InlineData("not json", "not valid JSON")]
    [InlineData("[]", "not a JSON object")]
    [InlineData("""{"postgresMajor":"18"}""", "has no assets")]
    [InlineData("""{"postgresMajor":"18","assets":{"win-x64":{"fileName":"a","url":"b"}}}""", "missing 'sha256'")]
    [InlineData("""{"postgresMajor":"18","assets":{"win-x64":{"fileName":"a","url":"","sha256":"c"}}}""", "missing 'url'")]
    public void ReportsMalformedManifests(string json, string expected)
    {
        var error = Assert.Throws<InvalidOperationException>(() => PostgresManagerService.SelectPayloadAsset(json, "win-x64", "18", "manifest"));
        Assert.Contains(expected, error.Message);
    }

    [Fact]
    public async Task ChecksumMatchesCaseInsensitively()
    {
        var path = WriteArchive("payload bytes");
        var expected = Convert.ToHexString(SHA256.HashData("payload bytes"u8));
        await PostgresManagerService.VerifySha256Async(path, $" {expected} ", TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task CorruptDownloadIsRejected()
    {
        var path = WriteArchive("payload bytes");
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            PostgresManagerService.VerifySha256Async(path, new string('0', 64), TestContext.Current.CancellationToken));
        Assert.Contains("corrupt", error.Message);
        Assert.Contains(Path.GetFileName(path), error.Message);
    }

    private string WriteArchive(string content)
    {
        Directory.CreateDirectory(_root);
        var path = Path.Combine(_root, "postgres-18.3-test.tar.gz");
        File.WriteAllText(path, content);
        return path;
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }
}
