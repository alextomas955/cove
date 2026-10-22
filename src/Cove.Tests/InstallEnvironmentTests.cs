using Cove.Api.Updates;

namespace Cove.Tests;

public class InstallEnvironmentTests
{
    private const string AppDirectory = "/opt/cove";

    private static InstallEnvironment Detect(
        Dictionary<string, string>? environment = null,
        string? distribution = "native-linux-x64",
        string? processPath = "/opt/cove/Cove",
        string[]? files = null,
        bool writable = true)
    {
        environment ??= [];
        var existing = new HashSet<string>(files ?? [], StringComparer.Ordinal);
        return InstallEnvironment.Detect(new InstallProbe
        {
            GetEnvironmentVariable = name => environment.GetValueOrDefault(name),
            FileExists = existing.Contains,
            CanWriteDirectory = _ => writable,
            ProcessPath = processPath,
            AppDirectory = AppDirectory,
            Distribution = distribution,
            IsWindows = false,
            RuntimeRid = "linux-x64",
        });
    }

    [Fact]
    public void Release_build_started_directly_is_native_and_can_apply()
    {
        var environment = Detect(files: ["/opt/cove/Cove.InstanceManager"]);

        Assert.Equal(InstallKinds.Native, environment.Kind);
        Assert.Equal(LaunchModes.Direct, environment.LaunchMode);
        Assert.Equal("linux-x64", environment.Rid);
        Assert.Equal("/opt/cove/Cove", environment.ExecutablePath);
        Assert.True(environment.InstanceManagerPresent);
        Assert.Null(environment.CannotApplyReason);
    }

    [Fact]
    public void Explicit_marker_wins_even_for_a_native_binary()
    {
        var environment = Detect(new() { ["COVE_INSTALL_KIND"] = "docker" });

        Assert.Equal(InstallKinds.Docker, environment.Kind);
        Assert.NotNull(environment.CannotApplyReason);
    }

    [Theory]
    [InlineData("/.dockerenv")]
    [InlineData("/run/.containerenv")]
    public void Dotnet_host_inside_a_container_is_docker(string marker)
        => Assert.Equal(InstallKinds.Docker, Detect(distribution: null, processPath: "/usr/share/dotnet/dotnet", files: [marker]).Kind);

    [Fact]
    public void Dotnet_running_in_container_variable_is_docker()
        => Assert.Equal(InstallKinds.Docker, Detect(new() { ["DOTNET_RUNNING_IN_CONTAINER"] = "true" }).Kind);

    [Fact]
    public void Build_without_distribution_marker_is_source_and_check_only()
    {
        var environment = Detect(distribution: null);

        Assert.Equal(InstallKinds.Source, environment.Kind);
        Assert.Contains("development build", environment.CannotApplyReason);
    }

    [Fact]
    public void Native_marker_under_the_dotnet_host_is_not_an_apphost_and_cannot_apply()
        => Assert.Equal(InstallKinds.Source, Detect(processPath: "/usr/bin/dotnet").Kind);

    [Fact]
    public void Instance_manager_variable_selects_instance_manager_mode()
    {
        var environment = Detect(new() { ["COVE_MANAGER_INSTANCE_ID"] = "default", ["INVOCATION_ID"] = "abc" });

        Assert.Equal(LaunchModes.InstanceManager, environment.LaunchMode);
        Assert.Equal("default", environment.ManagerInstanceId);
    }

    [Theory]
    [InlineData("INVOCATION_ID")]
    [InlineData("NOTIFY_SOCKET")]
    public void Systemd_variables_select_systemd_mode(string variable)
        => Assert.Equal(LaunchModes.Systemd, Detect(new() { [variable] = "x" }).LaunchMode);

    [Fact]
    public void Read_only_program_folder_cannot_apply()
    {
        var environment = Detect(writable: false);

        Assert.False(environment.AppDirectoryWritable);
        Assert.Contains("cannot write", environment.CannotApplyReason);
    }

    [Fact]
    public void Program_folder_is_where_the_executable_is_not_the_bundle_extraction_folder()
    {
        // AppContext.BaseDirectory of a single-file build with extracted content points elsewhere.
        var environment = Detect(processPath: "/srv/apps/cove/Cove");

        Assert.Equal("/srv/apps/cove", environment.AppDirectory);
        Assert.Equal("/srv/apps/cove/Cove", environment.ExecutablePath);
        Assert.Null(environment.CannotApplyReason);
    }
}
