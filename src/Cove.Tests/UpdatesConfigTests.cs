using Cove.Api.Services;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;
using Cove.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cove.Tests;

public sealed class UpdatesConfigTests
{
    [Fact]
    public void Defaults_check_for_updates_but_never_install_automatically()
    {
        var config = new CoveConfiguration().Updates;

        Assert.True(config.CheckEnabled);
        Assert.Equal("auto", config.Channel);
        Assert.Equal(12, config.CheckIntervalHours);
        Assert.True(config.ShowBanner);
        Assert.Equal("off", config.AutoUpdate);
        Assert.Equal("03:00-05:00", config.AutoUpdateWindow);
    }

    [Fact]
    public void Invalid_settings_are_normalized_to_defaults()
    {
        var normalized = ConfigService.NormalizeUpdatesConfig(new UpdatesConfigDto
        {
            CheckEnabled = false,
            Channel = " Nightly ",
            CheckIntervalHours = 0,
            ShowBanner = false,
            AutoUpdate = "yolo",
            AutoUpdateWindow = "25:00-26:00",
        });

        Assert.False(normalized.CheckEnabled);
        Assert.Equal("nightly", normalized.Channel);
        Assert.Equal(12, normalized.CheckIntervalHours);
        Assert.False(normalized.ShowBanner);
        Assert.Equal("off", normalized.AutoUpdate);
        Assert.Equal("03:00-05:00", normalized.AutoUpdateWindow);
    }

    [Fact]
    public async Task Config_without_an_updates_section_keeps_the_stored_update_settings()
    {
        var root = Path.Combine(Path.GetTempPath(), $"cove-updates-config-{Guid.NewGuid():N}");
        var configuration = new CoveConfiguration();
        var service = new ConfigService(configuration, NullLogger<ConfigService>.Instance, Path.Combine(root, "cove-config.json"));
        try
        {
            await service.UpdateUpdatesConfigAsync(updates => updates with { AutoUpdate = "safe", Channel = "stable" });

            await service.SaveConfigAsync(service.GetConfig() with { Updates = null, Port = 6000 });

            Assert.Equal(6000, configuration.Port);
            Assert.Equal("safe", configuration.Updates.AutoUpdate);
            Assert.Equal("stable", configuration.Updates.Channel);
            var reloaded = await service.LoadSavedConfigAsync();
            Assert.Equal("safe", reloaded!.Updates!.AutoUpdate);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    /// <summary>
    /// The release workflows list a build's migrations for cove-release.json from the migration file
    /// names; that must match what EF reports at runtime, or "safe" automatic updates would misjudge.
    /// </summary>
    [Fact]
    public void Migration_file_names_match_the_migration_ids_ef_reports()
    {
        using var db = new CoveContext(new DbContextOptionsBuilder<CoveContext>()
            .UseNpgsql("Host=127.0.0.1;Database=unused", options => options.UseVector())
            .Options);
        var reported = db.Database.GetMigrations().Order(StringComparer.Ordinal).ToArray();

        var directory = FindMigrationsDirectory();
        var fromFiles = Directory.GetFiles(directory, "*.cs")
            .Select(Path.GetFileNameWithoutExtension)
            .Where(name => !name!.EndsWith(".Designer", StringComparison.Ordinal) && !name.EndsWith("ModelSnapshot", StringComparison.Ordinal))
            .Order(StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(reported, fromFiles);
    }

    private static string FindMigrationsDirectory()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
        {
            var candidate = Path.Combine(directory.FullName, "src", "Cove.Data", "Migrations");
            if (Directory.Exists(candidate))
                return candidate;
        }
        throw new DirectoryNotFoundException("src/Cove.Data/Migrations was not found above the test output.");
    }
}
