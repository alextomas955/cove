using System.Text;
using System.Text.RegularExpressions;

namespace Cove.Api.Updates;

/// <summary>
/// Copies this process's console output to the file named by <see cref="Variable"/>, so the relauncher
/// can show what a failed start printed. On Windows the relauncher starts Cove in its own visible
/// console, as if the user had started it, so the output cannot be redirected there. Every Cove from
/// the first one with in-app updates honors the variable; keep honoring it, because an older relauncher
/// relies on the version it starts to write this file.
/// </summary>
internal static class UpdateConsoleCapture
{
    public const string Variable = "COVE_UPDATE_CONSOLE_LOG";

    private static readonly Lock Gate = new();
    private static StreamWriter? _file;

    /// <summary>Starts the copy when the variable is set, and clears it so child processes do not inherit it.</summary>
    public static void StartFromEnvironment()
    {
        var path = Environment.GetEnvironmentVariable(Variable);
        if (string.IsNullOrWhiteSpace(path))
            return;
        Environment.SetEnvironmentVariable(Variable, null);

        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
            var stream = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.ReadWrite | FileShare.Delete);
            lock (Gate)
                _file = new StreamWriter(stream, new UTF8Encoding(false)) { AutoFlush = true };
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
        {
            Console.Error.WriteLine($"Could not open {path} for the update console log: {ex.Message}");
            return;
        }

        Console.SetOut(new TeeWriter(Console.Out));
        Console.SetError(new TeeWriter(Console.Error));
        AppDomain.CurrentDomain.UnhandledException += (_, args) => Append($"Unhandled exception: {args.ExceptionObject}{Environment.NewLine}");
    }

    /// <summary>Stops copying once Cove has started; only the start-up output is needed.</summary>
    public static void Stop()
    {
        lock (Gate)
        {
            _file?.Dispose();
            _file = null;
        }
    }

    private static void Append(string text)
    {
        lock (Gate)
        {
            try
            {
                _file?.Write(text);
            }
            catch (Exception ex) when (ex is IOException or ObjectDisposedException)
            {
                _file = null;
            }
        }
    }

    /// <summary>Writes to the original console writer and, while capturing, to the log file.</summary>
    private sealed class TeeWriter(TextWriter console) : TextWriter
    {
        public override Encoding Encoding => console.Encoding;

        public override void Write(char value)
        {
            console.Write(value);
            Append(value.ToString());
        }

        public override void Write(char[] buffer, int index, int count)
        {
            console.Write(buffer, index, count);
            Append(new string(buffer, index, count));
        }

        public override void Write(string? value)
        {
            console.Write(value);
            if (value is not null)
                Append(value);
        }

        public override void WriteLine(string? value)
        {
            console.WriteLine(value);
            Append(value + Environment.NewLine);
        }

        public override void Flush() => console.Flush();
    }
}

/// <summary>
/// Finds the output of the start the relauncher is watching. <see cref="Mark"/> runs after the previous
/// process has exited and before the new one starts; <see cref="Read"/> then returns only what was
/// written since, so a rollback never shows the previous version's log as the failed start.
/// </summary>
internal sealed partial class UpdateLogTail
{
    private const int TailLines = 40;
    private readonly Dictionary<string, long> _baseline = new(OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
    private string? _logDirectory;

    public void Mark(string logDirectory, string consoleLogPath)
    {
        _logDirectory = logDirectory;
        _baseline.Clear();
        try
        {
            if (File.Exists(consoleLogPath))
                File.Delete(consoleLogPath);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
        }

        foreach (var file in EnumerateCoveLogs(logDirectory))
            _baseline[file.FullName] = file.Length;
    }

    /// <summary>The last lines of the console log, else of a Cove log file the new process wrote to; null when there is neither.</summary>
    public string? Read(string consoleLogPath)
    {
        if (_logDirectory is null)
            return null;

        if (ReadFrom(consoleLogPath, 0) is { } console)
            return console;

        // Cove's own daily log and the Instance Manager's per-start logs; a file that existed before the
        // start is read only from where it ended then.
        foreach (var file in EnumerateCoveLogs(_logDirectory).OrderByDescending(file => file.LastWriteTimeUtc))
        {
            var start = _baseline.GetValueOrDefault(file.FullName);
            if (file.Length > start && ReadFrom(file.FullName, start) is { } appended)
                return appended;
        }
        return null;
    }

    private static IEnumerable<FileInfo> EnumerateCoveLogs(string logDirectory)
    {
        try
        {
            return Directory.Exists(logDirectory) ? new DirectoryInfo(logDirectory).GetFiles("cove-*.log") : [];
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return [];
        }
    }

    private static string? ReadFrom(string path, long offset)
    {
        try
        {
            if (!File.Exists(path))
                return null;
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            if (offset > stream.Length)
                return null;
            stream.Seek(offset, SeekOrigin.Begin);
            using var reader = new StreamReader(stream);
            var text = AnsiEscape().Replace(reader.ReadToEnd(), string.Empty);
            var tail = string.Join('\n', text.Split('\n').TakeLast(TailLines)).Trim();
            return tail.Length == 0 ? null : tail;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    [GeneratedRegex(@"\x1B\[[0-9;]*[A-Za-z]")]
    private static partial Regex AnsiEscape();
}
