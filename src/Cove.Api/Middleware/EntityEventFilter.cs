using Cove.Core.Contracts;
using Cove.Core.Events;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Cove.Api.Middleware;

/// <summary>
/// Global action filter that automatically publishes EntityEvents on the core EventBus
/// whenever entity CRUD operations complete successfully. This ensures extensions receive
/// lifecycle events without modifying every controller.
/// </summary>
public sealed class EntityEventFilter : IAsyncActionFilter
{
    // Entity discriminators come from the shared Cove.Core.Contracts.EntityKinds catalog so this
    // producer and the extension event bridge agree on the tokens by construction.
    private static readonly Dictionary<string, string> ControllerEntityMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Videos"] = EntityKinds.Video,
        ["Performers"] = EntityKinds.Performer,
        ["Studios"] = EntityKinds.Studio,
        ["Tags"] = EntityKinds.Tag,
        ["Galleries"] = EntityKinds.Gallery,
        ["Images"] = EntityKinds.Image,
        ["Groups"] = EntityKinds.Group,
    };

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var result = await next();

        // Only publish events for successful mutations
        if (result.Exception != null || result.Canceled) return;

        var controllerName = context.RouteData.Values["controller"]?.ToString();
        if (controllerName == null || !ControllerEntityMap.TryGetValue(controllerName, out var entityType))
            return;

        var actionName = context.RouteData.Values["action"]?.ToString()?.ToLowerInvariant();
        if (actionName == null) return;

        var eventBus = context.HttpContext.RequestServices.GetService<IEventBus>();
        if (eventBus == null) return;

        var (eventType, entityId) = DetermineEvent(actionName, entityType, context, result);
        if (eventType == null) return;

        eventBus.Publish(new EntityEvent(eventType.Value, entityType, entityId));
    }

    private static (EventType? eventType, int entityId) DetermineEvent(
        string action, string entityType, ActionExecutingContext context, ActionExecutedContext result)
    {
        var entityId = ExtractEntityId(context, result);

        return action switch
        {
            "create" => (GetEventType(entityType, "created"), entityId),
            "update" => (GetEventType(entityType, "updated"), entityId),
            "delete" => (GetEventType(entityType, "deleted"), entityId),
            "bulkupdate" => (GetEventType(entityType, "updated"), 0), // bulk = id 0
            _ => (null, 0),
        };
    }

    private static int ExtractEntityId(ActionExecutingContext context, ActionExecutedContext result)
    {
        // Try route parameter first
        if (context.RouteData.Values.TryGetValue("id", out var idObj) && int.TryParse(idObj?.ToString(), out var id))
            return id;

        // Try to get from response body for creates
        if (result.Result is ObjectResult { Value: not null } objResult)
        {
            var idProp = objResult.Value.GetType().GetProperty("Id") ?? objResult.Value.GetType().GetProperty("id");
            if (idProp != null && idProp.PropertyType == typeof(int))
                return (int)(idProp.GetValue(objResult.Value) ?? 0);
        }

        return 0;
    }

    private static EventType? GetEventType(string entityType, string operation) =>
        (entityType, operation) switch
        {
            (EntityKinds.Video, "created") => EventType.VideoCreated,
            (EntityKinds.Video, "updated") => EventType.VideoUpdated,
            (EntityKinds.Video, "deleted") => EventType.VideoDeleted,
            (EntityKinds.Performer, "created") => EventType.PerformerCreated,
            (EntityKinds.Performer, "updated") => EventType.PerformerUpdated,
            (EntityKinds.Performer, "deleted") => EventType.PerformerDeleted,
            (EntityKinds.Studio, "created") => EventType.StudioCreated,
            (EntityKinds.Studio, "updated") => EventType.StudioUpdated,
            (EntityKinds.Studio, "deleted") => EventType.StudioDeleted,
            (EntityKinds.Tag, "created") => EventType.TagCreated,
            (EntityKinds.Tag, "updated") => EventType.TagUpdated,
            (EntityKinds.Tag, "deleted") => EventType.TagDeleted,
            (EntityKinds.Gallery, "created") => EventType.GalleryCreated,
            (EntityKinds.Gallery, "updated") => EventType.GalleryUpdated,
            (EntityKinds.Gallery, "deleted") => EventType.GalleryDeleted,
            (EntityKinds.Image, "created") => EventType.ImageCreated,
            (EntityKinds.Image, "updated") => EventType.ImageUpdated,
            (EntityKinds.Image, "deleted") => EventType.ImageDeleted,
            (EntityKinds.Group, "created") => EventType.GroupCreated,
            (EntityKinds.Group, "updated") => EventType.GroupUpdated,
            (EntityKinds.Group, "deleted") => EventType.GroupDeleted,
            _ => null,
        };
}

