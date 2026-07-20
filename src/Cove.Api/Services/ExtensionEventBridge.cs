using Cove.Core.Contracts;
using Cove.Core.Events;
using Cove.Plugins;

namespace Cove.Api.Services;

/// <summary>
/// Bridges the core EventBus to the extension event dispatch system.
/// Subscribes to all EntityEvent publications and dispatches them
/// as ExtensionEvents to all IEventExtension instances.
/// </summary>
public sealed class ExtensionEventBridge : IHostedService, IDisposable
{
    private readonly IEventBus _eventBus;
    private readonly ExtensionManager _extensionManager;
    private readonly ILogger<ExtensionEventBridge> _logger;
    private IDisposable? _subscription;

    public ExtensionEventBridge(
        IEventBus eventBus,
        ExtensionManager extensionManager,
        ILogger<ExtensionEventBridge> logger)
    {
        _eventBus = eventBus;
        _extensionManager = extensionManager;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _subscription = _eventBus.Subscribe<EntityEvent>(OnEntityEvent);
        _logger.LogInformation("Extension event bridge started");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _subscription?.Dispose();
        _logger.LogInformation("Extension event bridge stopped");
        return Task.CompletedTask;
    }

    private void OnEntityEvent(EntityEvent evt)
    {
        var extensionEvent = new ExtensionEvent(
            EventType: MapEventType(evt.Type),
            EntityType: MapEntityType(evt.EntityType),
            EntityId: evt.EntityId,
            Data: evt.Entity != null ? new Dictionary<string, object?> { ["entity"] = evt.Entity } : null
        );

        // Fire-and-forget dispatch to extensions (don't block the publisher)
        _ = Task.Run(async () =>
        {
            try
            {
                await _extensionManager.DispatchEventAsync(extensionEvent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error dispatching event {EventType} to extensions", extensionEvent.EventType);
            }
        });
    }

    // The dotted extension event kinds come from the shared Cove.Core.Contracts registry
    // (EventKindStrings) — the single source of truth for these wire tokens. Sourcing them here
    // rather than from inline literals means any divergence between this producer and the registry
    // is caught at compile time; the emitted strings are unchanged.
    private static string MapEventType(EventType type) => type switch
    {
        EventType.VideoCreated => EventKindStrings.VideoCreated,
        EventType.VideoUpdated => EventKindStrings.VideoUpdated,
        EventType.VideoDeleted => EventKindStrings.VideoDeleted,
        EventType.PerformerCreated => EventKindStrings.PerformerCreated,
        EventType.PerformerUpdated => EventKindStrings.PerformerUpdated,
        EventType.PerformerDeleted => EventKindStrings.PerformerDeleted,
        EventType.TagCreated => EventKindStrings.TagCreated,
        EventType.TagUpdated => EventKindStrings.TagUpdated,
        EventType.TagDeleted => EventKindStrings.TagDeleted,
        EventType.TagMerged => EventKindStrings.TagMerged,
        EventType.StudioCreated => EventKindStrings.StudioCreated,
        EventType.StudioUpdated => EventKindStrings.StudioUpdated,
        EventType.StudioDeleted => EventKindStrings.StudioDeleted,
        EventType.GalleryCreated => EventKindStrings.GalleryCreated,
        EventType.GalleryUpdated => EventKindStrings.GalleryUpdated,
        EventType.GalleryDeleted => EventKindStrings.GalleryDeleted,
        EventType.ImageCreated => EventKindStrings.ImageCreated,
        EventType.ImageUpdated => EventKindStrings.ImageUpdated,
        EventType.ImageDeleted => EventKindStrings.ImageDeleted,
        EventType.GroupCreated => EventKindStrings.GroupCreated,
        EventType.GroupUpdated => EventKindStrings.GroupUpdated,
        EventType.GroupDeleted => EventKindStrings.GroupDeleted,
        EventType.RatingCreated => EventKindStrings.RatingCreated,
        EventType.RatingUpdated => EventKindStrings.RatingUpdated,
        EventType.RatingDeleted => EventKindStrings.RatingDeleted,
        EventType.ScanStarted => EventKindStrings.ScanStarted,
        EventType.ScanCompleted => EventKindStrings.ScanCompleted,
        _ => type.ToString().ToLowerInvariant(),
    };

    // Entity discriminators are normalized against the shared EntityKinds catalog so the token this
    // producer stamps agrees by construction with the registry consumed by the code generator and
    // the frontend. Known kinds resolve to the catalog constant; anything else (e.g. an
    // extension-introduced entity) falls back to the lowercased value unchanged.
    private static string MapEntityType(string entityType) => entityType.ToLowerInvariant() switch
    {
        EntityKinds.Audio => EntityKinds.Audio,
        EntityKinds.Face => EntityKinds.Face,
        EntityKinds.Gallery => EntityKinds.Gallery,
        EntityKinds.Group => EntityKinds.Group,
        EntityKinds.Image => EntityKinds.Image,
        EntityKinds.Performer => EntityKinds.Performer,
        EntityKinds.Segment => EntityKinds.Segment,
        EntityKinds.Studio => EntityKinds.Studio,
        EntityKinds.Tag => EntityKinds.Tag,
        EntityKinds.Text => EntityKinds.Text,
        EntityKinds.Video => EntityKinds.Video,
        var other => other,
    };

    public void Dispose() => _subscription?.Dispose();
}

