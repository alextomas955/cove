using Cove.Api.Updates;

namespace Cove.Tests;

/// <summary>Which Instance Manager instances an update of this executable also changes.</summary>
public sealed class InstanceRegistryTests
{
    private static readonly string Root = Path.Combine(Path.GetTempPath(), "cove-registry-test");
    private static readonly string ThisExe = Path.Combine(Root, "app", "Cove");
    private static readonly string OtherExe = Path.Combine(Root, "other-copy", "Cove");

    [Fact]
    public void Only_instances_whose_start_script_runs_this_executable_are_listed()
    {
        var scripts = new Dictionary<string, string>
        {
            [Script("own")] = ShellScript(ThisExe),
            [Script("same")] = ShellScript(ThisExe + "/"),
            [Script("other")] = ShellScript(OtherExe),
        };

        var names = InstanceRegistry.FindInstancesLaunching(
            Registry(("Own", "own"), ("Same", "same"), ("Other", "other"), ("Never started", "never")),
            Home("own"),
            ThisExe,
            isWindows: false,
            path => scripts.GetValueOrDefault(path));

        Assert.Equal(["Same"], names);
    }

    [Fact]
    public void Windows_paths_compare_without_case()
    {
        var scripts = new Dictionary<string, string>
        {
            [Script("upper", windows: true)] = PowerShellScript(ThisExe.ToUpperInvariant()),
            [Script("other", windows: true)] = PowerShellScript(OtherExe),
        };

        var names = InstanceRegistry.FindInstancesLaunching(
            Registry(("Upper", "upper"), ("Other", "other")),
            Home("own"),
            ThisExe,
            isWindows: true,
            path => scripts.GetValueOrDefault(path));

        Assert.Equal(["Upper"], names);
    }

    [Theory]
    [InlineData(true, "$p = Start-Process -FilePath 'C:\\Program Files\\Bob''s Cove\\Cove.exe' -WorkingDirectory 'C:\\x' -PassThru", "C:\\Program Files\\Bob's Cove\\Cove.exe")]
    [InlineData(false, "#!/bin/sh\ncd '/opt' || exit 1\nnohup '/opt/bob'\\''s cove/Cove' >> '/tmp/log' 2>&1 &\n", "/opt/bob's cove/Cove")]
    [InlineData(false, "#!/bin/sh\necho nothing here\n", null)]
    public void Start_scripts_name_the_executable_they_run(bool windows, string script, string? expected)
        => Assert.Equal(expected, InstanceRegistry.ReadExecutable(script, windows));

    [Fact]
    public void A_broken_registry_lists_nobody()
        => Assert.Empty(InstanceRegistry.FindInstancesLaunching("{ not json", Home("own"), ThisExe, isWindows: false, _ => null));

    private static string Home(string id) => Path.Combine(Root, "homes", id);

    private static string Script(string id, bool windows = false)
        => Path.Combine(Home(id), ".manager", windows ? "start-cove.ps1" : "start-cove.sh");

    private static string ShellScript(string executable)
        => $"#!/bin/sh\nexport COVE_HOME='x'\ncd '/' || exit 1\nnohup '{executable}' >> '/tmp/cove.log' 2>&1 &\necho $! > '/tmp/cove.pid'\n";

    private static string PowerShellScript(string executable)
        => $"$ErrorActionPreference = 'Stop'\n$p = Start-Process -FilePath '{executable}' -WorkingDirectory 'C:\\' -RedirectStandardOutput 'a.log' -RedirectStandardError 'b.log' -WindowStyle Hidden -PassThru\n";

    private static string Registry(params (string Name, string Id)[] instances)
        => System.Text.Json.JsonSerializer.Serialize(new
        {
            instances = instances.Select(instance => new { id = instance.Id, name = instance.Name, homePath = Home(instance.Id) }),
        });
}
