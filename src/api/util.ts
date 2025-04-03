/**
 * API 응답에서 데이터 배열을 추출하는 유틸리티 함수
 * 다양한 API 응답 구조를 처리할 수 있도록 설계되었습니다.
 *
 * @param response API 응답 데이터
 * @param debug 디버그 로그 출력 여부 (선택 사항)
 * @returns 추출된 데이터 배열 또는 null
 */
export const extractDataArray = (response: any, debug = false): any[] | null => {
  if (!response) {
    if (debug) console.log("응답이 null 또는 undefined입니다.");
    return null;
  }

  if (debug) {
    console.log("응답 데이터 구조:", JSON.stringify(response, null, 2));
  }

  let dataArray = null;

  // 1. response.data.items 구조 (data 안에 items 배열)
  if (response.data?.items && Array.isArray(response.data.items)) {
    dataArray = response.data.items;
    if (debug) console.log("case 1: response.data.items 배열 발견", dataArray.length);
  }
  // 2. response.data.articles 구조 (data 안에 articles 배열)
  else if (response.data?.articles && Array.isArray(response.data.articles)) {
    dataArray = response.data.articles;
    if (debug) console.log("case 1.1: response.data.articles 배열 발견", dataArray.length);
  }
  // 3. response.ranks 구조 (회원 등급 API)
  else if (response.ranks && Array.isArray(response.ranks)) {
    dataArray = response.ranks;
    if (debug) console.log("case 1.5: response.ranks 배열 발견", dataArray.length);
  }
  // 4. response.items 구조 (직접적인 items 배열)
  else if (response.items && Array.isArray(response.items)) {
    dataArray = response.items;
    if (debug) console.log("case 2: response.items 배열 발견", dataArray.length);
  }
  // 5. response.data.data.items 구조 (중첩된 items 배열)
  else if (response.data?.data?.items && Array.isArray(response.data.data.items)) {
    dataArray = response.data.data.items;
    if (debug) console.log("case 3: response.data.data.items 배열 발견", dataArray.length);
  }
  // 6. response.data.data.articles 구조 (중첩된 articles 배열)
  else if (response.data?.data?.articles && Array.isArray(response.data.data.articles)) {
    dataArray = response.data.data.articles;
    if (debug) console.log("case 3.1: response.data.data.articles 배열 발견", dataArray.length);
  }
  // 7. response.data.data 구조 (중첩된 data 배열)
  else if (response.data?.data && Array.isArray(response.data.data)) {
    dataArray = response.data.data;
    if (debug) console.log("case 4: response.data.data 배열 발견", dataArray.length);
  }
  // 8. response.data 구조 (직접적인 data 배열)
  else if (response.data && Array.isArray(response.data)) {
    dataArray = response.data;
    if (debug) console.log("case 5: response.data 배열 발견", dataArray.length);
  }
  // 9. response 자체가 배열인 경우
  else if (Array.isArray(response)) {
    dataArray = response;
    if (debug) console.log("case 6: response 자체가 배열입니다", dataArray.length);
  }
  // 10. 일반적인 속성명으로 시도 (list, records, results 등)
  else {
    const possibleArrayProps = [
      "list",
      "records",
      "results",
      "contents",
      "games",
      "ranks",
      "articles",
    ];

    // 먼저 response.data 안에서 찾기
    if (response.data && typeof response.data === "object") {
      for (const prop of possibleArrayProps) {
        if (response.data[prop] && Array.isArray(response.data[prop])) {
          dataArray = response.data[prop];
          if (debug) console.log(`case 7a: response.data.${prop} 배열 발견`, dataArray.length);
          break;
        }
      }
    }

    // 배열을 찾지 못했다면 response에서 직접 찾기
    if (!dataArray && typeof response === "object") {
      for (const prop of possibleArrayProps) {
        if (response[prop] && Array.isArray(response[prop])) {
          dataArray = response[prop];
          if (debug) console.log(`case 7b: response.${prop} 배열 발견`, dataArray.length);
          break;
        }
      }
    }

    // 마지막으로 중첩된 데이터 구조 탐색
    if (!dataArray && response.data && typeof response.data === "object") {
      for (const key in response.data) {
        const value = response.data[key];
        if (value && typeof value === "object") {
          for (const prop of possibleArrayProps) {
            if (value[prop] && Array.isArray(value[prop])) {
              dataArray = value[prop];
              if (debug)
                console.log(`case 7c: response.data.${key}.${prop} 배열 발견`, dataArray.length);
              break;
            }
          }
          if (dataArray) break;
        }
      }
    }
  }

  // 아직 데이터를 찾지 못했고 응답에 data 객체가 있으면 로깅
  if (!dataArray && debug && response.data && typeof response.data === "object") {
    console.log(
      "응답에서 데이터 배열을 찾지 못했습니다. data 객체의 키:",
      Object.keys(response.data)
    );
  }

  return dataArray;
};
