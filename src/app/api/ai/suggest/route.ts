import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { AISuggestRequestSchema, AISuggestResponseSchema } from '@/domain/types';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const parseResult = AISuggestRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청 데이터입니다.', details: parseResult.error },
        { status: 400 }
      );
    }

    const requestData = parseResult.data;
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
당신은 사용자의 계획이 틀어졌을 때, 남은 시간에 맞춰 업무 범위를 현실적으로 축소(REDUCE)해주는 생산성 코치입니다.
사용자의 원래 업무 목표와 제약 조건을 바탕으로, 오늘 반드시 달성할 수 있는 '최소 성공 범위'를 제안해주세요.

[원래 업무 정보]
제목: ${requestData.title}
${requestData.notes ? `설명: ${requestData.notes}` : ''}
${requestData.estimatedMinutes ? `원래 예상 소요시간: ${requestData.estimatedMinutes}분` : ''}
${requestData.deadline ? `마감일/시: ${requestData.deadline}` : ''}

[요청 사항]
원래 업무를 모두 수행하기 어려운 상황입니다. 핵심 가치만 남긴 최소 수행 범위와 완료 기준을 제안해주세요.
소요시간이나 마감, 오늘 필수 여부 등을 지어내지 말고 원래 정보를 기반으로 판단하세요.
정보가 너무 부족하여 축소 범위를 제안할 수 없다면 needsClarification을 true로 설정하고 question을 작성하세요.

응답은 다음 JSON 스키마를 엄격히 준수해야 합니다. 다른 설명 텍스트는 포함하지 마세요.
{
  "taskId": "${requestData.taskId}",
  "suggestedScope": "축소된 업무 범위 (예: 보고서 전체 작성 → 목차와 핵심 근거 3개 정리)",
  "doneCriteria": "완료 기준 (확인 가능한 구체적인 기준)",
  "rationale": "왜 이렇게 줄이는 것이 효과적인지 짧은 이유",
  "needsClarification": boolean,
  "question": "정보가 부족할 경우 물어볼 질문 (아니면 null)"
}
`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // Parse and validate the response
    const jsonResponse = JSON.parse(responseText);
    
    // Ensure taskId matches request
    jsonResponse.taskId = requestData.taskId;

    const validatedResponse = AISuggestResponseSchema.parse(jsonResponse);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    return NextResponse.json(
      { error: 'AI 범위 제안 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
