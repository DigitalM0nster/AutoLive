// src/app/api/health/db/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		await prisma.$queryRaw`SELECT 1`; // Простой пинг к БД
		return NextResponse.json({ status: "ok" });
	} catch (error) {
		return NextResponse.json({ status: "error", message: "DB connection failed" }, { status: 500 });
	}
}
