using System.Text.Json;
using System.Text.RegularExpressions;

namespace Cove.Api.Updates;

/// <summary>
/// Reads the Instance Manager's per-user registry (<c>cove-instances.json</c>) and the start script it
/// writes for each instance, to find the other instances an update of this executable also changes.
/// </summary>
internal static partial class InstanceRegistry
{
    /// <summary>
    /// Names of the registered instances, other than the one in <paramref name="ownDataRoot"/>, whose
    /// <c>.manager/start-cove.ps1</c> (Windows) or <c>start-cove.sh</c> starts
    /// <paramref name="executablePath"/>. An instance that was never started has no script and is left out.
    /// </summary>
    public static IReadOnlyList<string> FindInstancesLaunching(
        string registryJson,
        string ownDataRoot,
        string executablePath,
        bool isWindows,
        Func<string, string?>? readFile = null)
    {
        readFile ??= ReadFileOrNull;
        var comparison = isWindows ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        try
        {
            using var document = JsonDocument.Parse(registryJson);
            if (!document.RootElement.TryGetProperty("instances", out var instances) || instances.ValueKind != JsonValueKind.Array)
                return [];

            var ownRoot = Normalize(ownDataRoot);
            var executable = Normalize(executablePath);
            var names = new List<string>();
            foreach (var instance in instances.EnumerateArray())
            {
                if (!instance.TryGetProperty("homePath", out var home) || home.GetString() is not { } homePath || string.IsNullOrWhiteSpace(homePath))
                    continue;
                if (string.Equals(Normalize(homePath), ownRoot, comparison))
                    continue;

                var script = readFile(Path.Combine(homePath, ".manager", isWindows ? "start-cove.ps1" : "start-cove.sh"));
                if (script is null || ReadExecutable(script, isWindows) is not { } launched)
                    continue;
                if (!string.Equals(Normalize(launched), executable, comparison))
                    continue;

                names.Add(instance.TryGetProperty("name", out var name) && name.GetString() is { Length: > 0 } text ? text : "(unnamed)");
            }
            return names;
        }
        catch (Exception ex) when (ex is JsonException or ArgumentException or NotSupportedException or PathTooLongException)
        {
            return [];
        }
    }

    /// <summary>The executable a start script launches: <c>Start-Process -FilePath '…'</c> or <c>nohup '…'</c>.</summary>
    internal static string? ReadExecutable(string script, bool isWindows)
    {
        if (isWindows)
        {
            var match = PowerShellFilePath().Match(script);
            return match.Success ? match.Groups["path"].Value.Replace("''", "'", StringComparison.Ordinal) : null;
        }

        var shell = ShellCommand().Match(script);
        return shell.Success ? shell.Groups["path"].Value.Replace("'\\''", "'", StringComparison.Ordinal) : null;
    }

    private static string Normalize(string path) => Path.TrimEndingDirectorySeparator(Path.GetFullPath(path));

    private static string? ReadFileOrNull(string path)
    {
        try
        {
            return File.Exists(path) ? File.ReadAllText(path) : null;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    [GeneratedRegex(@"Start-Process\s+-FilePath\s+'(?<path>(?:[^']|'')*)'", RegexOptions.IgnoreCase)]
    private static partial Regex PowerShellFilePath();

    [GeneratedRegex(@"^nohup\s+'(?<path>(?:[^']|'\\'')*)'", RegexOptions.Multiline)]
    private static partial Regex ShellCommand();
}
