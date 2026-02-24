export function InfoTab() {
  return (
    <div className="w-full max-w-md space-y-6 text-sm text-gray-700">
      <section>
        <h2 className="font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">
          게임 소개
        </h2>
        <p className="text-gray-500">
          멋지게 맞추거나 멋지게 틀리거나
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">
          수록 작품 출처
        </h2>
        <p className="text-gray-500">
          나무위키에서긁어옴
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">
          문의
        </h2>
        <p className="text-gray-500">
          mame
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">
          버전
        </h2>
        <p className="text-gray-500">v0.1.0</p>
      </section>
    </div>
  );
}
