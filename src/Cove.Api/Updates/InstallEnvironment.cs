using System.Reflection;
using System.Runtime.InteropServices;

namespace Cove.Api.Updates;

internal static class InstallKinds
{
    public const string Docker = "docker";
    public const string Native = "native";
    /// <summary>A local or development build without a release distribution marker: check only.</summary>
    public const string Source = "source";
}

internal static class LaunchModes
{
    public const string Direct = "direct";
    public const string InstanceManager = "instance-manager";
    public const string Systemd = "systemd";
}

/// <summary>
/// What kind of install this process is and how it was started. Detection only; nothing here changes
/// the system.
/// </summary>
internal sealed record InstallEnvironment
{
    public const string InstallKindVariable = "COVE_INSTALL_KIND";
    public const string ManagerInstanceVariable = "COVE_MANAGER_INSTANCE_ID";
    public const string DistributionMetadataKey = "CoveDistribution";
    public const string ReleaseChannelMetadataKey = "CoveReleaseChannel";

    public required string Kind { get; init; }
    public required string LaunchMode { get; init; }
    /// <summary>The baked-in distribution marker, e.g. <c>native-linux-x64</c>.</summary>
    public string? Distribution { get; init; }
    public string? BuildChannel { get; init; }
    public string? Rid { get; init; }
    public required string AppDirectory { get; init; }
    /// <summary>Full path of the running Cove executable.</summary>
    public string? ExecutablePath { get; init; }
    public bool AppDirectoryWritable { get; init; }
    public bool InstanceManagerPresent { get; init; }
    public string? ManagerInstanceId { get; init; }
    public bool IsWindows { get; init; }

    public string CoveFileName => ExecutablePath is { } path ? Path.GetFileName(path) : IsWindows ? "Cove.exe" : "Cove";
    public string ManagerFileName => IsWindows ? "Cove.InstanceManager.exe" : "Cove.InstanceManager";

    /// <summary>Null when an update can be applied in place; otherwise why not.</summary>
    public string? CannotApplyReason => Kind switch
    {
        InstallKinds.Docker => "Cove runs in a container. Pull the new image instead.",
        InstallKinds.Source => "This is a development build without a release marker, so it can only check for updates.",
        _ when Rid is null => "The platform of this build is unknown.",
        _ when ExecutablePath is null => "The Cove executable could not be located.",
        _ when !AppDirectoryWritable => $"Cove cannot write to its program folder ({AppDirectory}). Update manually, or give the Cove user write access to that folder.",
        _ => null,
    };

    public static InstallEnvironment DetectCurrent()
    {
        var assembly = Assembly.GetEntryAssembly() ?? typeof(InstallEnvironment).Assembly;
        string? Metadata(string key) => assembly.GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(attribute => string.Equals(attribute.Key, key, StringComparison.Ordinal))?.Value;

        return Detect(new InstallProbe
        {
            GetEnvironmentVariable = Environment.GetEnvironmentVariable,
            FileExists = File.Exists,
            CanWriteDirectory = CanWriteDirectory,
            ProcessPath = Environment.ProcessPath,
            AppDirectory = AppContext.BaseDirectory,
            Distribution = Metadata(DistributionMetadataKey),
            BuildChannel = Metadata(ReleaseChannelMetadataKey),
            IsWindows = OperatingSystem.IsWindows(),
            RuntimeRid = RuntimeInformation.RuntimeIdentifier,
        });
    }

    public static InstallEnvironment Detect(InstallProbe probe)
    {
        var appDirectory = Path.TrimEndingDirectorySeparator(Path.GetFullPath(probe.AppDirectory));
        var processPath = probe.ProcessPath;
        var isDotnetHost = processPath is not null
            && string.Equals(Path.GetFileNameWithoutExtension(processPath), "dotnet", StringComparison.OrdinalIgnoreCase);
        var nativeRid = probe.Distribution is { } distribution && distribution.StartsWith("native-", StringComparison.Ordinal)
            ? distribution["native-".Length..]
            : null;

        string kind;
        var explicitKind = probe.GetEnvironmentVariable(InstallKindVariable)?.Trim().ToLowerInvariant();
        if (explicitKind is InstallKinds.Docker)
            kind = InstallKinds.Docker;
        else if (IsTrue(probe.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"))
            || ((isDotnetHost || nativeRid is null) && (probe.FileExists("/.dockerenv") || probe.FileExists("/run/.containerenv"))))
            kind = InstallKinds.Docker;
        else if (nativeRid is not null && !isDotnetHost)
            kind = InstallKinds.Native;
        else
            kind = InstallKinds.Source;

        var managerInstanceId = probe.GetEnvironmentVariable(ManagerInstanceVariable);
        var launchMode = !string.IsNullOrWhiteSpace(managerInstanceId)
            ? LaunchModes.InstanceManager
            : !string.IsNullOrWhiteSpace(probe.GetEnvironmentVariable("INVOCATION_ID"))
                || !string.IsNullOrWhiteSpace(probe.GetEnvironmentVariable("NOTIFY_SOCKET"))
                ? LaunchModes.Systemd
                : LaunchModes.Direct;

        var executablePath = kind == InstallKinds.Native && processPath is not null
            && string.Equals(
                Path.TrimEndingDirectorySeparator(Path.GetDirectoryName(Path.GetFullPath(processPath)) ?? string.Empty),
                appDirectory,
                OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal)
            ? Path.GetFullPath(processPath)
            : null;
        var managerName = probe.IsWindows ? "Cove.InstanceManager.exe" : "Cove.InstanceManager";

        return new InstallEnvironment
        {
            Kind = kind,
            LaunchMode = launchMode,
            Distribution = probe.Distribution,
            BuildChannel = probe.BuildChannel,
            Rid = nativeRid ?? (kind == InstallKinds.Native ? null : probe.RuntimeRid),
            AppDirectory = appDirectory,
            ExecutablePath = executablePath,
            AppDirectoryWritable = kind == InstallKinds.Native && probe.CanWriteDirectory(appDirectory),
            InstanceManagerPresent = probe.FileExists(Path.Combine(appDirectory, managerName)),
            ManagerInstanceId = string.IsNullOrWhiteSpace(managerInstanceId) ? null : managerInstanceId.Trim(),
            IsWindows = probe.IsWindows,
        };
    }

    internal static bool CanWriteDirectory(string directory)
    {
        try
        {
            var probe = Path.Combine(directory, ".cove-write-probe-" + Guid.NewGuid().ToString("N"));
            File.WriteAllText(probe, string.Empty);
            File.Delete(probe);
            return true;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return false;
        }
    }

    private static bool IsTrue(string? value)
        => string.Equals(value?.Trim(), "true", StringComparison.OrdinalIgnoreCase) || value?.Trim() == "1";
}

/// <summary>The environment inputs to <see cref="InstallEnvironment.Detect"/>, injectable for tests.</summary>
internal sealed record InstallProbe
{
    public required Func<string, string?> GetEnvironmentVariable { get; init; }
    public required Func<string, bool> FileExists { get; init; }
    public required Func<string, bool> CanWriteDirectory { get; init; }
    public string? ProcessPath { get; init; }
    public required string AppDirectory { get; init; }
    public string? Distribution { get; init; }
    public string? BuildChannel { get; init; }
    public bool IsWindows { get; init; }
    public string? RuntimeRid { get; init; }
}
