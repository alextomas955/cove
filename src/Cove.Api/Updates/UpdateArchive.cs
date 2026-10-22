using System.Formats.Tar;
using System.IO.Compression;
using System.Security.Cryptography;

namespace Cove.Api.Updates;

internal sealed class UpdateArchiveException(string message, Exception? inner = null) : Exception(message, inner);

/// <summary>The two executables extracted from a verified release archive.</summary>
internal sealed record ExtractedUpdate(string CovePath, string ManagerPath);

/// <summary>
/// Downloads and checks a native release archive. A release archive holds exactly the two
/// single-file executables at its root, so anything else (an extra file, a directory, a link, a
/// path) is rejected rather than skipped.
/// </summary>
internal static class UpdateArchive
{
    /// <summary>Generous ceiling for one archive or one extracted executable.</summary>
    internal const long MaxBytes = 2L * 1024 * 1024 * 1024;

    public static IReadOnlyList<string> ExpectedEntries(bool windows)
        => windows ? ["Cove.exe", "Cove.InstanceManager.exe"] : ["Cove", "Cove.InstanceManager"];

    public static async Task DownloadAsync(
        HttpClient http,
        Uri uri,
        string destination,
        long expectedSize,
        Action<double>? progress,
        CancellationToken ct)
    {
        if (!UpdateFeedOptions.IsAllowed(uri))
            throw new UpdateArchiveException("Update downloads must use HTTPS.");

        using var response = await http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
            throw new UpdateArchiveException($"Downloading {uri} failed with HTTP {(int)response.StatusCode}.");

        var total = response.Content.Headers.ContentLength ?? (expectedSize > 0 ? expectedSize : (long?)null);
        if (total > MaxBytes)
            throw new UpdateArchiveException("The update archive is unexpectedly large.");

        await using var source = await response.Content.ReadAsStreamAsync(ct);
        await using (var target = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            var buffer = new byte[81920];
            long written = 0;
            int read;
            while ((read = await source.ReadAsync(buffer, ct)) > 0)
            {
                written += read;
                if (written > MaxBytes)
                    throw new UpdateArchiveException("The update archive is unexpectedly large.");
                await target.WriteAsync(buffer.AsMemory(0, read), ct);
                if (total is > 0)
                    progress?.Invoke(Math.Min(1d, (double)written / total.Value));
            }
        }

        if (expectedSize > 0 && new FileInfo(destination).Length != expectedSize)
            throw new UpdateArchiveException($"The downloaded archive is {new FileInfo(destination).Length} bytes; the release lists {expectedSize}.");
    }

    public static string ComputeSha256(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexStringLower(SHA256.HashData(stream));
    }

    public static void VerifySha256(string path, string expected)
    {
        var actual = ComputeSha256(path);
        if (!string.Equals(actual, expected.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new UpdateArchiveException($"Checksum mismatch: expected {expected.Trim().ToLowerInvariant()}, got {actual}. The download was discarded.");
    }

    /// <summary>
    /// Validates the archive and extracts <c>Cove.new</c> and <c>Cove.InstanceManager.new</c> into
    /// <paramref name="stagingDirectory"/>.
    /// </summary>
    public static ExtractedUpdate ExtractAndValidate(string archivePath, bool windows, string stagingDirectory)
    {
        var expected = ExpectedEntries(windows);
        Directory.CreateDirectory(stagingDirectory);
        var covePath = Path.Combine(stagingDirectory, expected[0] + ".new");
        var managerPath = Path.Combine(stagingDirectory, expected[1] + ".new");
        var targets = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [expected[0]] = covePath,
            [expected[1]] = managerPath,
        };

        try
        {
            if (archivePath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                ExtractZip(archivePath, targets);
            else if (archivePath.EndsWith(".tar.gz", StringComparison.OrdinalIgnoreCase))
                ExtractTarGz(archivePath, targets);
            else
                throw new UpdateArchiveException("Unsupported update archive format.");
        }
        catch
        {
            TryDelete(covePath);
            TryDelete(managerPath);
            throw;
        }

        if (!windows)
        {
            const UnixFileMode executable = UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute
                | UnixFileMode.GroupRead | UnixFileMode.GroupExecute | UnixFileMode.OtherRead | UnixFileMode.OtherExecute;
            if (!OperatingSystem.IsWindows())
            {
                File.SetUnixFileMode(covePath, executable);
                File.SetUnixFileMode(managerPath, executable);
            }
        }

        return new ExtractedUpdate(covePath, managerPath);
    }

    private static void ExtractTarGz(string archivePath, IReadOnlyDictionary<string, string> targets)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        using var file = File.OpenRead(archivePath);
        using var gzip = new GZipStream(file, CompressionMode.Decompress);
        using var reader = new TarReader(gzip);
        while (reader.GetNextEntry() is { } entry)
        {
            if (entry.EntryType is not (TarEntryType.RegularFile or TarEntryType.V7RegularFile))
                throw new UpdateArchiveException($"The archive contains '{entry.Name}', which is not a regular file ({entry.EntryType}).");
            var name = CheckEntryName(entry.Name, targets, seen);
            if (entry.Length > MaxBytes)
                throw new UpdateArchiveException($"'{name}' in the archive is unexpectedly large.");
            if (entry.DataStream is null)
                throw new UpdateArchiveException($"'{name}' in the archive has no content.");
            using var target = new FileStream(targets[name], FileMode.Create, FileAccess.Write, FileShare.None);
            entry.DataStream.CopyTo(target);
        }

        CheckAllPresent(targets, seen);
    }

    private static void ExtractZip(string archivePath, IReadOnlyDictionary<string, string> targets)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        using var zip = ZipFile.OpenRead(archivePath);
        foreach (var entry in zip.Entries)
        {
            // Unix mode bits live in the high word; 0xA000 is a symbolic link and 0x4000 a directory.
            var unixType = (entry.ExternalAttributes >> 16) & 0xF000;
            if (unixType is 0xA000 or 0x4000 || entry.FullName.EndsWith('/'))
                throw new UpdateArchiveException($"The archive contains '{entry.FullName}', which is not a regular file.");
            var name = CheckEntryName(entry.FullName, targets, seen);
            if (entry.Length > MaxBytes)
                throw new UpdateArchiveException($"'{name}' in the archive is unexpectedly large.");
            using var source = entry.Open();
            using var target = new FileStream(targets[name], FileMode.Create, FileAccess.Write, FileShare.None);
            source.CopyTo(target);
        }

        CheckAllPresent(targets, seen);
    }

    private static string CheckEntryName(string name, IReadOnlyDictionary<string, string> targets, HashSet<string> seen)
    {
        if (name.IndexOfAny(['/', '\\', ':']) >= 0 || name.Contains("..", StringComparison.Ordinal))
            throw new UpdateArchiveException($"The archive entry '{name}' has a path; only the two executables are allowed.");
        if (!targets.ContainsKey(name))
            throw new UpdateArchiveException($"The archive contains an unexpected entry '{name}'.");
        if (!seen.Add(name))
            throw new UpdateArchiveException($"The archive contains '{name}' more than once.");
        return name;
    }

    private static void CheckAllPresent(IReadOnlyDictionary<string, string> targets, HashSet<string> seen)
    {
        var missing = targets.Keys.Where(name => !seen.Contains(name)).ToList();
        if (missing.Count > 0)
            throw new UpdateArchiveException($"The archive is missing {string.Join(", ", missing)}.");
    }

    private static void TryDelete(string path)
    {
        try
        {
            File.Delete(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
        }
    }
}
