// src/app/api/users/otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db/client";
import {
  users,
  surveys,
  userAssignments,
  results,
} from "../../../../db/schema";
import {
  happinessSurveys,
  happinessAssignments,
  happinessResults,
} from "@/db/schema/happiness";
import { eq, and } from "drizzle-orm";
import { verifyOTP } from "../../../../lib/services/otp-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, identifier, otp, surveyId, skipOtpVerification } =
      body as {
        email?: string;
        phone?: string;
        identifier?: string;
        otp?: string;
        surveyId?: string;
        skipOtpVerification?: boolean;
      };

    // Helper function to determine survey type and get survey details
    const getSurveyDetails = async (id: string) => {
      // First check regular surveys
      const regularSurvey = await db
        .select({
          id: surveys.id,
          title: surveys.title,
          can_take_multiple: surveys.canTakeMultiple,
        })
        .from(surveys)
        .where(eq(surveys.id, id))
        .limit(1);

      if (regularSurvey.length > 0) {
        return {
          type: "regular" as const,
          survey: {
            id: regularSurvey[0].id,
            title: regularSurvey[0].title,
            canTakeMultiple: !!regularSurvey[0].can_take_multiple,
          },
        };
      }

      // Then check happiness surveys
      const happinessSurvey = await db
        .select({
          id: happinessSurveys.id,
          title: happinessSurveys.title,
          retakeCooldownDays: happinessSurveys.retakeCooldownDays,
        })
        .from(happinessSurveys)
        .where(eq(happinessSurveys.id, id))
        .limit(1);

      if (happinessSurvey.length > 0) {
        return {
          type: "happiness" as const,
          survey: {
            id: happinessSurvey[0].id,
            title: happinessSurvey[0].title,
            retakeCooldownDays: happinessSurvey[0].retakeCooldownDays,
          },
        };
      }

      return null;
    };

    // Helper function to handle happiness survey access
    const handleHappinessSurveyAccess = async (
      user: any,
      survey: any,
      surveyId: string
    ) => {
      // Check if user is assigned to this happiness survey
      const assignment = await db
        .select()
        .from(happinessAssignments)
        .where(
          and(
            eq(happinessAssignments.userId, user.id),
            eq(happinessAssignments.surveyId, surveyId),
            eq(happinessAssignments.isActive, true)
          )
        )
        .limit(1);

      if (assignment.length === 0) {
        return NextResponse.json({
          ok: true,
          assigned: false,
          hasSubmitted: false,
          surveyId: surveyId,
          survey: {
            id: survey.id,
            title: survey.title,
            canTakeMultiple: false,
          },
          user: user,
          message: "You are not assigned to this happiness survey.",
          access: {
            assigned: false,
            hasSubmitted: false,
            canAccess: false,
            reason: "not-assigned",
            message: "You are not assigned to this happiness survey.",
          },
        });
      }

      // Check if user has already submitted this survey
      const existingResult = await db
        .select()
        .from(happinessResults)
        .where(
          and(
            eq(happinessResults.surveyId, surveyId),
            eq(happinessResults.userId, user.id)
          )
        )
        .limit(1);

      const hasSubmitted = existingResult.length > 0;

      // Check cooldown if there are existing results
      let canAccess = true;
      let cooldownMessage = null;

      if (hasSubmitted && survey.retakeCooldownDays > 0) {
        const lastSubmission = existingResult[0];
        if (lastSubmission.createdAt) {
          const cooldownPeriod = survey.retakeCooldownDays * 24 * 60 * 60; // Convert days to seconds
          const timeSinceLastSubmission =
            Date.now() / 1000 - lastSubmission.createdAt;

          if (timeSinceLastSubmission < cooldownPeriod) {
            const remainingTime = Math.ceil(
              (cooldownPeriod - timeSinceLastSubmission) / (24 * 60 * 60)
            );
            canAccess = false;
            cooldownMessage = `You must wait ${remainingTime} more day(s) before retaking this survey`;
          }
        }
      }

      // ✅ ENHANCED: Comprehensive access status matching regular survey format
      const accessReason = !canAccess ? "cooldown" : "access-granted";
      const accessMessage = !canAccess
        ? cooldownMessage
        : "Access granted to happiness survey.";

      const responseData = {
        ok: true,
        assigned: true,
        hasSubmitted: hasSubmitted,
        surveyId: surveyId,
        survey: {
          id: survey.id,
          title: survey.title,
          canTakeMultiple: false,
        },
        user: user,
        message: accessMessage,
        // ✅ NEW: Comprehensive access status matching regular survey format
        access: {
          assigned: true,
          hasSubmitted: hasSubmitted,
          canAccess: canAccess,
          reason: accessReason,
          message: accessMessage,
        },
        // ✅ NEW: Include existing result data for cooldown period
        existingResult: !canAccess && hasSubmitted ? existingResult[0] : null,
      };

      console.log("✅ Successful happiness survey response:", responseData);

      const res = NextResponse.json(responseData);

      // Set session cookie (authenticated user)
      res.cookies.set(
        "user_session",
        JSON.stringify({
          id: user.id,
          email: user.email,
          phone: user.phone,
          loginTime: new Date().toISOString(),
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24, // 24h
        }
      );

      return res;
    };

    const normalizedIdentifier = identifier || email || phone || "";
    const looksLikeEmail = normalizedIdentifier.includes("@");

    console.log("🔍 /api/users/otp received:", {
      email,
      phone,
      identifier,
      otp: otp ? `${String(otp).slice(0, 3)}***` : undefined,
      surveyId,
      skipOtpVerification,
      idType: looksLikeEmail ? "email" : "phone",
    });

    if (!normalizedIdentifier) {
      return NextResponse.json(
        { error: "Email, phone, or identifier is required" },
        { status: 400 }
      );
    }

    if (!otp && !skipOtpVerification) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    // 1) Verify OTP unless explicitly skipped
    if (!skipOtpVerification) {
      const otpResult = await verifyOTP(normalizedIdentifier, String(otp));
      if (!otpResult.valid) {
        return NextResponse.json(
          { error: otpResult.message || "Invalid OTP" },
          { status: 401 }
        );
      }
      console.log("✅ OTP verified successfully");
    } else {
      console.log(
        "⏭️ Skipping OTP verification (already verified client-side)"
      );
    }

    // 2) Look up the user by email OR phone (bug fix)
    const userRows = await db
      .select()
      .from(users)
      .where(
        looksLikeEmail
          ? eq(users.email, normalizedIdentifier)
          : eq(users.phone, normalizedIdentifier)
      )
      .limit(1);

    // If user does not exist, respond as "not assigned" to match requested UX
    if (!userRows || userRows.length === 0) {
      // If a surveyId was provided, try to include survey meta for the UI
      let surveyMeta: {
        id: string;
        title: string;
        canTakeMultiple: boolean;
      } | null = null;

      if (surveyId) {
        const surveyDetails = await getSurveyDetails(surveyId);
        if (surveyDetails) {
          if (surveyDetails.type === "regular") {
            surveyMeta = {
              id: surveyDetails.survey.id,
              title: surveyDetails.survey.title,
              canTakeMultiple: surveyDetails.survey.canTakeMultiple,
            };
          } else {
            // For happiness surveys, we'll use a different structure
            surveyMeta = {
              id: surveyDetails.survey.id,
              title: surveyDetails.survey.title,
              canTakeMultiple: false, // Happiness surveys don't have this concept
            };
          }
        }
      }

      const res = NextResponse.json({
        ok: true,
        assigned: false,
        hasSubmitted: false,
        surveyId: surveyId ?? null,
        survey: surveyMeta,
        user: null,
        message:
          "You are not assigned to this survey (no user found for this identifier).",
        // ✅ NEW: Access status for user not found
        access: {
          assigned: false,
          hasSubmitted: false,
          canAccess: false,
          reason: "not-assigned",
          message: "You are not assigned to this survey.",
        },
      });

      // do NOT set a session cookie for non-existent users
      return res;
    }

    const userData = userRows[0];

    // 3) If surveyId provided, check assignment + submission status
    if (surveyId) {
      // Get survey details and type
      const surveyDetails = await getSurveyDetails(surveyId);
      if (!surveyDetails) {
        return NextResponse.json(
          { error: "Survey not found" },
          { status: 404 }
        );
      }

      if (surveyDetails.type === "happiness") {
        // Handle happiness survey logic
        return await handleHappinessSurveyAccess(
          userData,
          surveyDetails.survey,
          surveyId
        );
      }

      // Regular survey logic
      const surveySafe = {
        id: surveyDetails.survey.id,
        title: surveyDetails.survey.title,
        canTakeMultiple: surveyDetails.survey.canTakeMultiple,
      };

      console.log("🔍 Survey details:", {
        id: surveySafe.id,
        title: surveySafe.title,
        canTakeMultiple: surveySafe.canTakeMultiple,
        rawCanTakeMultiple: surveyDetails.survey.canTakeMultiple,
      });

      // Check assignment
      console.log("🔍 Checking assignment for:", {
        userId: userData.id,
        surveyId: surveyId,
        userEmail: userData.email,
      });

      const assignment = await db
        .select()
        .from(userAssignments)
        .where(
          and(
            eq(userAssignments.userId, userData.id),
            eq(userAssignments.surveyId, surveyId)
          )
        )
        .limit(1);

      console.log("🔍 Assignment query result:", assignment);
      const assigned = assignment.length > 0;
      console.log("🔍 User assigned:", assigned);
      console.log("🔍 Assignment details:", {
        found: assignment.length,
        assignment: assignment[0] || null,
        searchUserId: userData.id,
        searchSurveyId: surveyId,
      });

      // If not assigned → respond gracefully (200) so UI can show friendly message
      if (!assigned) {
        const res = NextResponse.json({
          ok: true,
          assigned: false,
          hasSubmitted: false,
          surveyId,
          survey: surveySafe,
          user: {
            id: userData.id,
            email: userData.email,
            phone: userData.phone,
          },
          message: "You are not assigned to this survey.",
          // ✅ NEW: Access status for not assigned user
          access: {
            assigned: false,
            hasSubmitted: false,
            canAccess: false,
            reason: "not-assigned",
            message: "You are not assigned to this survey.",
          },
        });

        // we do set a short session so the UI can keep context if needed
        res.cookies.set(
          "user_session",
          JSON.stringify({
            id: userData.id,
            email: userData.email,
            phone: userData.phone,
            loginTime: new Date().toISOString(),
          }),
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24, // 24h (consistent with other settings)
          }
        );

        return res;
      }

      // Check if the user has already submitted (for single-take surveys)
      let hasSubmitted = false;
      console.log(`🔍 /api/users/otp checking submission status:`, {
        userId: userData.id,
        userEmail: userData.email,
        surveyId,
        canTakeMultiple: surveySafe.canTakeMultiple,
      });

      if (!surveySafe.canTakeMultiple) {
        console.log(
          `🔍 Single-take survey - checking existing submissions for user ${userData.id}`
        );

        const existing = await db
          .select()
          .from(results)
          .where(
            and(eq(results.userId, userData.id), eq(results.surveyId, surveyId))
          )
          .limit(1);

        hasSubmitted = existing.length > 0;

        console.log(`🔍 Submission check result:`, {
          userId: userData.id,
          surveyId,
          existingCount: existing.length,
          hasSubmitted,
        });
      } else {
        console.log(
          `🔍 Multi-take survey - allowing submission regardless of history`
        );
      }

      // ✅ ENHANCED: Comprehensive access status
      const canAccess =
        hasSubmitted && !surveySafe.canTakeMultiple ? false : true;
      const accessReason = !canAccess ? "already-submitted" : "access-granted";

      const responseData = {
        ok: true,
        assigned: true,
        hasSubmitted,
        surveyId,
        survey: {
          id: surveySafe.id,
          title: surveySafe.title,
          canTakeMultiple: surveySafe.canTakeMultiple,
        },
        user: {
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
        },
        // ✅ NEW: Comprehensive access status
        access: {
          assigned: true,
          hasSubmitted,
          canAccess,
          reason: accessReason,
          message: !canAccess
            ? "You have already submitted this survey and it can only be completed once."
            : "Access granted to survey.",
        },
      };

      console.log("✅ Successful assignment response:", responseData);

      const res = NextResponse.json(responseData);

      // Set session cookie (authenticated user)
      res.cookies.set(
        "user_session",
        JSON.stringify({
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          loginTime: new Date().toISOString(),
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24, // 24h (consistent with other settings)
        }
      );

      return res;
    }

    // 4) No surveyId → just authenticate user and set session
    const res = NextResponse.json({
      ok: true,
      assigned: false, // unknown without surveyId
      hasSubmitted: false, // unknown without surveyId
      surveyId: null,
      survey: null,
      user: {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
      },
      message:
        "User authenticated successfully. Provide surveyId to check assignment.",
      // ✅ NEW: Access status for no surveyId
      access: {
        assigned: false,
        hasSubmitted: false,
        canAccess: false,
        reason: "no-survey-id",
        message: "Survey ID required to check access.",
      },
    });

    res.cookies.set(
      "user_session",
      JSON.stringify({
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        loginTime: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24h (consistent with other settings)
      }
    );

    return res;
  } catch (error) {
    console.error("❌ Error in /api/users/otp:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
