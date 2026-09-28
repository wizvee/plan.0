import { NextResponse } from "next/server";

import { getAccessToken, getPickerAppId } from "@/lib/google-drive";
import { handleGoogleApiError, requireGoogleAuth } from "@/lib/google-account";

/** 브라우저의 Google Picker(자료 탭 "Drive에서 가져오기")가 쓸 단기 액세스 토큰을 발급한다.
 * refresh token은 서버 밖으로 절대 안 나가고, 여기서 매번 새로 교환한 access token만 내려준다.
 * Picker가 고른 파일에 drive.file 권한을 부여하려면 앱 ID(프로젝트 번호)도 필요해서 같이 준다. */
export async function GET() {
  const auth = await requireGoogleAuth();
  if (!auth.ok) return auth.error;

  try {
    const accessToken = await getAccessToken(auth.refreshToken);
    return NextResponse.json({ accessToken, appId: getPickerAppId() });
  } catch (err) {
    return handleGoogleApiError(auth, err);
  }
}
