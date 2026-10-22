extern alias InstanceManager;

using System.Diagnostics;
using CoveInstanceRecord = InstanceManager::CoveInstanceRecord;
using InstanceManagerService = InstanceManager::InstanceManagerService;

namespace Cove.Tests;

/// <summary>
/// After an update Cove restarts itself by re-running the instance's start script, which writes the new
/// PID to <c>.manager/cove.pid</c>. The manager must follow that PID rather than report the instance
/// stopped.
/// </summary>
public sealed class InstanceManagerPidAdoptionTests : IDisposable
{
    private readonly string _home = Path.Combine(Path.GetTempPath(), "cove-im-adopt-" + Guid.NewGuid().ToString("N"));

    public InstanceManagerPidAdoptionTests() => Directory.CreateDirectory(Path.Combine(_home, ".manager"));

    public void Dispose() => Directory.Delete(_home, recursive: true);

    [Fact]
    public void Live_pid_written_after_the_last_start_is_adopted()
    {
        var instance = new CoveInstanceRecord { HomePath = _home, LastProcessId = 999_999, LastStartedAt = DateTimeOffset.UtcNow.AddMinutes(-5) };
        File.WriteAllText(Path.Combine(_home, ".manager", "cove.pid"), Environment.ProcessId.ToString());

        InstanceManagerService.AdoptRelaunchedProcess(instance);

        Assert.Equal(Environment.ProcessId, instance.LastProcessId);
    }

    [Fact]
    public void Pid_file_older_than_the_last_start_is_ignored()
    {
        var pidFile = Path.Combine(_home, ".manager", "cove.pid");
        File.WriteAllText(pidFile, Environment.ProcessId.ToString());
        File.SetLastWriteTimeUtc(pidFile, DateTime.UtcNow.AddHours(-1));
        var instance = new CoveInstanceRecord { HomePath = _home, LastProcessId = 999_999, LastStartedAt = DateTimeOffset.UtcNow };

        InstanceManagerService.AdoptRelaunchedProcess(instance);

        Assert.Equal(999_999, instance.LastProcessId);
    }

    [Fact]
    public void Dead_pid_is_ignored()
    {
        using var exited = Process.Start(new ProcessStartInfo("dotnet", ["--version"]) { RedirectStandardOutput = true })!;
        exited.WaitForExit();
        File.WriteAllText(Path.Combine(_home, ".manager", "cove.pid"), exited.Id.ToString());
        var instance = new CoveInstanceRecord { HomePath = _home, LastProcessId = 999_999 };

        InstanceManagerService.AdoptRelaunchedProcess(instance);

        Assert.Equal(999_999, instance.LastProcessId);
    }
}
