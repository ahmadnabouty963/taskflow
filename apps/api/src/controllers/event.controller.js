import prisma from "../lib/prisma.js";

export async function createEvent(request, response, next) {
  try {
    const event = await prisma.calendarEvent.create({
      data: {
        ...request.body,
        ownerId: request.user.id,
      },
    });

    return response.status(201).json({
      success: true,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEvents(request, response, next) {
  try {
    const { from, to } = request.validatedQuery;
    const events = await prisma.calendarEvent.findMany({
      where: {
        ownerId: request.user.id,
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    });

    return response.status(200).json({
      success: true,
      data: { events },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(request, response, next) {
  try {
    const { eventId } = request.validatedParams;
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id: eventId, ownerId: request.user.id },
      select: { id: true },
    });

    if (!existingEvent) {
      return response.status(404).json({
        success: false,
        error: { code: "EVENT_NOT_FOUND", message: "Event not found." },
      });
    }

    const event = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: request.body,
    });

    return response.status(200).json({
      success: true,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(request, response, next) {
  try {
    const { eventId } = request.validatedParams;
    const result = await prisma.calendarEvent.deleteMany({
      where: { id: eventId, ownerId: request.user.id },
    });

    if (result.count === 0) {
      return response.status(404).json({
        success: false,
        error: { code: "EVENT_NOT_FOUND", message: "Event not found." },
      });
    }

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
