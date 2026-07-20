using System.Text.Json.Serialization;

namespace Cove.Core.Events;

// SignalR wire contract — pinned wire names are public API; do not rename.
public enum EventType
{
    // Entity lifecycle
    [JsonStringEnumMemberName("videoCreated")] VideoCreated,
    [JsonStringEnumMemberName("videoUpdated")] VideoUpdated,
    [JsonStringEnumMemberName("videoDeleted")] VideoDeleted,
    [JsonStringEnumMemberName("performerCreated")] PerformerCreated,
    [JsonStringEnumMemberName("performerUpdated")] PerformerUpdated,
    [JsonStringEnumMemberName("performerDeleted")] PerformerDeleted,
    [JsonStringEnumMemberName("tagCreated")] TagCreated,
    [JsonStringEnumMemberName("tagUpdated")] TagUpdated,
    [JsonStringEnumMemberName("tagDeleted")] TagDeleted,
    [JsonStringEnumMemberName("tagMerged")] TagMerged,
    [JsonStringEnumMemberName("studioCreated")] StudioCreated,
    [JsonStringEnumMemberName("studioUpdated")] StudioUpdated,
    [JsonStringEnumMemberName("studioDeleted")] StudioDeleted,
    [JsonStringEnumMemberName("galleryCreated")] GalleryCreated,
    [JsonStringEnumMemberName("galleryUpdated")] GalleryUpdated,
    [JsonStringEnumMemberName("galleryDeleted")] GalleryDeleted,
    [JsonStringEnumMemberName("imageCreated")] ImageCreated,
    [JsonStringEnumMemberName("imageUpdated")] ImageUpdated,
    [JsonStringEnumMemberName("imageDeleted")] ImageDeleted,
    [JsonStringEnumMemberName("audioCreated")] AudioCreated,
    [JsonStringEnumMemberName("audioUpdated")] AudioUpdated,
    [JsonStringEnumMemberName("audioDeleted")] AudioDeleted,
    [JsonStringEnumMemberName("textCreated")] TextCreated,
    [JsonStringEnumMemberName("textUpdated")] TextUpdated,
    [JsonStringEnumMemberName("textDeleted")] TextDeleted,
    [JsonStringEnumMemberName("groupCreated")] GroupCreated,
    [JsonStringEnumMemberName("groupUpdated")] GroupUpdated,
    [JsonStringEnumMemberName("groupDeleted")] GroupDeleted,

    // User set or cleared a rating on an entity. The published EntityEvent carries a
    // Dictionary<string,object?> { userId, aspect, value } as its Entity payload (value null = cleared).
    [JsonStringEnumMemberName("ratingCreated")] RatingCreated,
    [JsonStringEnumMemberName("ratingUpdated")] RatingUpdated,
    [JsonStringEnumMemberName("ratingDeleted")] RatingDeleted,

    // Jobs
    [JsonStringEnumMemberName("scanStarted")] ScanStarted,
    [JsonStringEnumMemberName("scanProgress")] ScanProgress,
    [JsonStringEnumMemberName("scanCompleted")] ScanCompleted,
    [JsonStringEnumMemberName("generateStarted")] GenerateStarted,
    [JsonStringEnumMemberName("generateProgress")] GenerateProgress,
    [JsonStringEnumMemberName("generateCompleted")] GenerateCompleted,
    [JsonStringEnumMemberName("cleanStarted")] CleanStarted,
    [JsonStringEnumMemberName("cleanProgress")] CleanProgress,
    [JsonStringEnumMemberName("cleanCompleted")] CleanCompleted,

    // System
    [JsonStringEnumMemberName("serverStarted")] ServerStarted,
    [JsonStringEnumMemberName("serverStopping")] ServerStopping
}

public record CoveEvent(EventType Type, object? Data = null);

public record EntityEvent(EventType Type, string EntityType, int EntityId, object? Entity = null) : CoveEvent(Type, Entity);

public record JobEvent(EventType Type, string JobId, string Description, double Progress, string? SubTask = null) : CoveEvent(Type);

public interface IEventBus
{
    void Publish(CoveEvent evt);
    IDisposable Subscribe(Action<CoveEvent> handler);
    IDisposable Subscribe(EventType type, Action<CoveEvent> handler);
    IDisposable Subscribe<T>(Action<T> handler) where T : CoveEvent;
}

public class EventBus : IEventBus
{
    private readonly List<Subscription> _subscriptions = [];
    private readonly Lock _lock = new();

    public void Publish(CoveEvent evt)
    {
        List<Subscription> subs;
        lock (_lock) { subs = [.. _subscriptions]; }

        foreach (var sub in subs)
        {
            if (sub.Type == null || sub.Type == evt.Type)
            {
                try { sub.Handler(evt); }
                catch { /* Don't let subscriber errors crash publisher */ }
            }
        }
    }

    public IDisposable Subscribe(Action<CoveEvent> handler)
    {
        var sub = new Subscription(null, handler);
        lock (_lock) { _subscriptions.Add(sub); }
        return new Unsubscriber(() => { lock (_lock) { _subscriptions.Remove(sub); } });
    }

    public IDisposable Subscribe(EventType type, Action<CoveEvent> handler)
    {
        var sub = new Subscription(type, handler);
        lock (_lock) { _subscriptions.Add(sub); }
        return new Unsubscriber(() => { lock (_lock) { _subscriptions.Remove(sub); } });
    }

    public IDisposable Subscribe<T>(Action<T> handler) where T : CoveEvent
    {
        var sub = new Subscription(null, evt => { if (evt is T typed) handler(typed); });
        lock (_lock) { _subscriptions.Add(sub); }
        return new Unsubscriber(() => { lock (_lock) { _subscriptions.Remove(sub); } });
    }

    private record Subscription(EventType? Type, Action<CoveEvent> Handler);

    private class Unsubscriber(Action action) : IDisposable
    {
        public void Dispose() => action();
    }
}

