using System.Formats.Tar;
using System.IO.Compression;
using System.Text;
using Cove.Api.Updates;

namespace Cove.Tests;

public sealed class UpdateArchiveTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "cove-update-archive-" + Guid.NewGuid().ToString("N"));

    public UpdateArchiveTests() => Directory.CreateDirectory(_root);

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Fact]
    public void Valid_tarball_extracts_both_executables_as_executable_new_files()
    {
        var archive = WriteTarGz(("Cove", "cove-binary"), ("Cove.InstanceManager", "manager-binary"));

        var extracted = UpdateArchive.ExtractAndValidate(archive, windows: false, Path.Combine(_root, "staging"));

        Assert.Equal("cove-binary", File.ReadAllText(extracted.CovePath));
        Assert.Equal("manager-binary", File.ReadAllText(extracted.ManagerPath));
        Assert.EndsWith("Cove.new", extracted.CovePath);
        if (!OperatingSystem.IsWindows())
            Assert.True(File.GetUnixFileMode(extracted.CovePath).HasFlag(UnixFileMode.UserExecute));
    }

    [Fact]
    public void Valid_zip_extracts_windows_executables()
    {
        var archive = WriteZip(("Cove.exe", "cove", null), ("Cove.InstanceManager.exe", "manager", null));

        var extracted = UpdateArchive.ExtractAndValidate(archive, windows: true, Path.Combine(_root, "staging"));

        Assert.Equal("cove", File.ReadAllText(extracted.CovePath));
        Assert.EndsWith("Cove.exe.new", extracted.CovePath);
    }

    [Fact]
    public void Checksum_mismatch_is_rejected()
    {
        var archive = WriteTarGz(("Cove", "a"), ("Cove.InstanceManager", "b"));
        var actual = UpdateArchive.ComputeSha256(archive);

        UpdateArchive.VerifySha256(archive, actual.ToUpperInvariant());
        var error = Assert.Throws<UpdateArchiveException>(() => UpdateArchive.VerifySha256(archive, new string('0', 64)));
        Assert.Contains("Checksum mismatch", error.Message);
    }

    [Fact]
    public void Extra_entry_is_rejected()
        => AssertRejected(WriteTarGz(("Cove", "a"), ("Cove.InstanceManager", "b"), ("README", "c")), "unexpected entry");

    [Fact]
    public void Missing_entry_is_rejected()
        => AssertRejected(WriteTarGz(("Cove", "a")), "missing");

    [Fact]
    public void Duplicate_entry_is_rejected()
        => AssertRejected(WriteTarGz(("Cove", "a"), ("Cove", "b"), ("Cove.InstanceManager", "c")), "more than once");

    [Theory]
    [InlineData("../Cove")]
    [InlineData("./Cove")]
    [InlineData("bin/Cove")]
    [InlineData("/Cove")]
    public void Paths_are_rejected(string name)
        => AssertRejected(WriteTarGz((name, "a"), ("Cove.InstanceManager", "b")), "path");

    [Fact]
    public void Tar_symlink_is_rejected()
    {
        var path = Path.Combine(_root, "link.tar.gz");
        using (var file = File.Create(path))
        using (var gzip = new GZipStream(file, CompressionLevel.Fastest))
        using (var writer = new TarWriter(gzip, TarEntryFormat.Pax))
        {
            writer.WriteEntry(new PaxTarEntry(TarEntryType.SymbolicLink, "Cove") { LinkName = "/bin/sh" });
            AddTarFile(writer, "Cove.InstanceManager", "b");
        }

        AssertRejected(path, "not a regular file");
    }

    [Fact]
    public void Zip_symlink_is_rejected()
        => AssertRejected(WriteZip(("Cove.exe", "C:\\Windows\\notepad.exe", 0xA1FF), ("Cove.InstanceManager.exe", "b", null)), "not a regular file", windows: true);

    [Fact]
    public void Zip_traversal_is_rejected()
        => AssertRejected(WriteZip(("..\\Cove.exe", "a", null), ("Cove.InstanceManager.exe", "b", null)), "path", windows: true);

    private void AssertRejected(string archive, string expectedMessage, bool windows = false)
    {
        var staging = Path.Combine(_root, "staging");
        var error = Assert.Throws<UpdateArchiveException>(() => UpdateArchive.ExtractAndValidate(archive, windows, staging));
        Assert.Contains(expectedMessage, error.Message);
        // Nothing half-extracted is left for the swap to pick up.
        Assert.Empty(Directory.Exists(staging) ? Directory.GetFiles(staging) : []);
    }

    private string WriteTarGz(params (string Name, string Content)[] entries)
    {
        var path = Path.Combine(_root, Guid.NewGuid().ToString("N") + ".tar.gz");
        using var file = File.Create(path);
        using var gzip = new GZipStream(file, CompressionLevel.Fastest);
        using var writer = new TarWriter(gzip, TarEntryFormat.Pax);
        foreach (var (name, content) in entries)
            AddTarFile(writer, name, content);
        return path;
    }

    private static void AddTarFile(TarWriter writer, string name, string content)
        => writer.WriteEntry(new PaxTarEntry(TarEntryType.RegularFile, name)
        {
            DataStream = new MemoryStream(Encoding.UTF8.GetBytes(content)),
        });

    private string WriteZip(params (string Name, string Content, int? UnixMode)[] entries)
    {
        var path = Path.Combine(_root, Guid.NewGuid().ToString("N") + ".zip");
        using var zip = ZipFile.Open(path, ZipArchiveMode.Create);
        foreach (var (name, content, unixMode) in entries)
        {
            var entry = zip.CreateEntry(name);
            if (unixMode is { } mode)
                entry.ExternalAttributes = mode << 16;
            using var stream = entry.Open();
            stream.Write(Encoding.UTF8.GetBytes(content));
        }
        return path;
    }
}
