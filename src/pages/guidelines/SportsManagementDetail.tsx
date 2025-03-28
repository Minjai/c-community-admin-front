import React, { useEffect, useState } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post } from "@/types";
import axios from "@/api/axios";

// GuidelineDetail 컴포넌트를 재사용하고 boardId만 다르게 설정
import GuidelineDetail from "./GuidelineDetail";

const SportsManagementDetail = () => {
  // boardId 4는 스포츠 가이드라인
  return <GuidelineDetail boardId={4} />;
};

export default SportsManagementDetail;
