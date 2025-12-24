import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AuthState,
  MastodonAccount,
  MastodonStatus,
  ActivityData,
} from "./types";
import { MastodonService } from "./services/mastodon";
import ActivityHeatmap from "./components/ActivityHeatmap";
import StatusCard from "./components/StatusCard";

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const saved = localStorage.getItem("mastodon_auth");
    return saved ? JSON.parse(saved) : null;
  });

  const [account, setAccount] = useState<MastodonAccount | null>(null);
  const [statuses, setStatuses] = useState<MastodonStatus[]>([]);
  const [lastId, setLastId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasReadStatuses, setHasReadStatuses] = useState<boolean>(true);
  const [fetchCount, setFetchCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // UI States
  const [searchInputValue, setSearchInputValue] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Login Form States
  const [instanceInput, setInstanceInput] = useState(auth?.instance || "");
  const [tokenInput, setTokenInput] = useState(auth?.token || "");
  const [fetchAllOnStart, setFetchAllOnStart] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const mastodonService = useMemo(() => {
    if (!auth) return null;
    return new MastodonService(auth.instance, auth.token);
  }, [auth]);

  const fetchInitialData = useCallback(async () => {
    if (!mastodonService || !auth) return;
    setIsLoading(true);
    setFetchCount(0);
    setError(null);
    try {
      const acc = await mastodonService.verifyCredentials();
      setAccount(acc);

      const thresholdDate = new Date();
      if (fetchAllOnStart) {
        thresholdDate.setFullYear(thresholdDate.getFullYear() - 20);
      } else {
        thresholdDate.setMonth(thresholdDate.getMonth() - 3);
      }

      const {
        statuses: initialPosts,
        lastId: newLastId,
        fellBack,
      } = await mastodonService.getStatusesUntil(
        acc.id,
        thresholdDate,
        undefined,
        (count) => setFetchCount(count)
      );
      setStatuses(initialPosts);
      setLastId(newLastId);
      setHasReadStatuses(!fellBack);
    } catch (err: any) {
      setError(err.message || "获取数据失败");
      if (err.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [mastodonService, auth, fetchAllOnStart]);

  const handleExploreMore = async (months: number = 3) => {
    if (!mastodonService || !account || isLoading) return;
    setIsLoading(true);
    try {
      const oldestTootDate =
        statuses.length > 0
          ? new Date(statuses[statuses.length - 1].created_at)
          : new Date();

      const threshold = new Date(oldestTootDate);
      threshold.setMonth(threshold.getMonth() - months);

      const {
        statuses: moreStatuses,
        lastId: newLastId,
        fellBack,
      } = await mastodonService.getStatusesUntil(
        account.id,
        threshold,
        lastId,
        (count) => setFetchCount(statuses.length + count)
      );

      setStatuses((prev) => [...prev, ...moreStatuses]);
      setLastId(newLastId);
      if (fellBack) setHasReadStatuses(false);
    } catch (err: any) {
      setError("加载更多失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchAllHistory = async () => {
    if (!mastodonService || !account || isLoading) return;
    setIsLoading(true);
    try {
      const threshold = new Date(0);
      const {
        statuses: moreStatuses,
        lastId: newLastId,
        fellBack,
      } = await mastodonService.getStatusesUntil(
        account.id,
        threshold,
        lastId,
        (count) => setFetchCount(statuses.length + count)
      );
      setStatuses((prev) => [...prev, ...moreStatuses]);
      setLastId(newLastId);
      if (fellBack) setHasReadStatuses(false);
    } catch (err: any) {
      setError("获取全部历史失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (auth) {
      fetchInitialData();
    }
  }, [auth, fetchInitialData]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleTestAuth = async () => {
    const trimmedToken = tokenInput.trim();
    if (!instanceInput || !trimmedToken) {
      setTestResult({ status: "error", message: "请填写实例地址和访问令牌" });
      return;
    }
    setTestResult({ status: "testing" });
    try {
      const tempService = new MastodonService(instanceInput, trimmedToken);
      const acc = await tempService.verifyCredentials();
      setTestResult({
        status: "success",
        message: `连接成功！已识别为您：${acc.display_name} (@${acc.username})`,
      });
    } catch (err: any) {
      setTestResult({ status: "error", message: `连接失败: ${err.message}` });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedToken = tokenInput.trim();
    if (!instanceInput || !trimmedToken) return;
    const newAuth: AuthState = {
      instance: instanceInput,
      token: trimmedToken,
    };
    setAuth(newAuth);
    localStorage.setItem("mastodon_auth", JSON.stringify(newAuth));
  };

  const handleLogout = () => {
    setAuth(null);
    setAccount(null);
    setStatuses([]);
    setSelectedMonth(null);
    setSelectedDate(null);
    setFilterStartDate("");
    setFilterEndDate("");
    setSearchInputValue("");
    setAppliedSearchQuery("");
    setTestResult({ status: "idle" });
    setHasReadStatuses(true);
    localStorage.removeItem("mastodon_auth");
  };

  const timelineGroups = useMemo(() => {
    const groups: Record<string, { label: string; count: number }> = {};
    statuses.forEach((s) => {
      if (!s.created_at) return;
      const key = s.created_at.substring(0, 7);
      if (!groups[key]) {
        const [year, month] = key.split("-");
        groups[key] = { label: `${year}年 ${parseInt(month)}月`, count: 0 };
      }
      groups[key].count++;
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [statuses]);

  const filteredStatuses = useMemo(() => {
    let result = statuses;
    if (appliedSearchQuery.trim()) {
      const query = appliedSearchQuery.toLowerCase();
      result = result.filter((s) => {
        const plainContent = s.content.replace(/<[^>]*>?/gm, "").toLowerCase();
        return (
          plainContent.includes(query) ||
          s.account.display_name.toLowerCase().includes(query) ||
          s.account.username.toLowerCase().includes(query)
        );
      });
    }
    if (selectedDate) {
      result = result.filter(
        (s) => s.created_at && s.created_at.startsWith(selectedDate)
      );
    } else if (selectedMonth) {
      result = result.filter(
        (s) => s.created_at && s.created_at.startsWith(selectedMonth)
      );
    }
    if (filterStartDate) {
      result = result.filter(
        (s) => new Date(s.created_at) >= new Date(filterStartDate)
      );
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.created_at) <= end);
    }
    return result;
  }, [
    statuses,
    appliedSearchQuery,
    selectedMonth,
    selectedDate,
    filterStartDate,
    filterEndDate,
  ]);

  const lastTootDate = statuses.length > 0 ? statuses[0].created_at : undefined;
  const oldestTootDate =
    statuses.length > 0 ? statuses[statuses.length - 1].created_at : undefined;

  const activityData = useMemo((): ActivityData[] => {
    const counts: Record<string, number> = {};
    statuses.forEach((s) => {
      if (!s.created_at) return;
      const date = s.created_at.split("T")[0];
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [statuses]);

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-gray-900">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">动态面板</h1>
            <p className="text-xs text-gray-400 mt-2">
              基于令牌自动识别身份，仅本人可查看嘟文
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                实例 URL
              </label>
              <input
                type="text"
                placeholder="例如: mastodon.social"
                value={instanceInput}
                onChange={(e) => setInstanceInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                访问令牌 (Access Token)
              </label>
              <div className="mt-1">
                <p className="text-[10px] text-indigo-500 font-bold leading-tight flex items-start gap-1">
                  <svg
                    className="w-3 h-3 mt-0.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    若token仅包括read:accounts权限则只抓取公开嘟文，如包含
                    read:statuses则抓取全部嘟文
                  </span>
                </p>
              </div>
              <input
                type="password"
                placeholder="粘贴您的令牌"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full mt-2 px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                required
              />
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  id="fetchAll"
                  checked={fetchAllOnStart}
                  onChange={(e) => setFetchAllOnStart(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="fetchAll"
                  className="text-sm text-gray-600 cursor-pointer select-none font-medium"
                >
                  自动抓取全部历史动态
                </label>
              </div>
              <div className="mt-1">
                <p className="text-[10px] text-indigo-500 font-bold leading-tight flex items-start gap-1">
                  <svg
                    className="w-3 h-3 mt-0.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>初始同步近 3 个月</span>
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleTestAuth}
                disabled={testResult.status === "testing"}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                  testResult.status === "testing"
                    ? "bg-gray-50 text-gray-400 border-gray-200"
                    : testResult.status === "success"
                    ? "bg-green-50 text-green-600 border-green-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {testResult.status === "testing" && (
                  <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                )}
                {testResult.status === "success"
                  ? "令牌有效 ✓"
                  : "测试令牌并查找身份"}
              </button>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow-md transition-colors"
              >
                进入面板
              </button>
            </div>

            {testResult.message && (
              <div
                className={`text-xs p-3 rounded-lg border animate-in fade-in zoom-in-95 duration-200 ${
                  testResult.status === "success"
                    ? "bg-green-50 border-green-100 text-green-700"
                    : "bg-red-50 border-red-100 text-red-700"
                }`}
              >
                {testResult.message}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl leading-none">
              M
            </div>
            <h1 className="font-bold text-lg hidden sm:block tracking-tight text-gray-800">
              Activity Explorer
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {account && (
              <div className="flex items-center gap-3 pr-4 border-r border-gray-100">
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-sm font-bold text-gray-800">
                    {account.display_name}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">
                    @{account.username}
                  </span>
                </div>
                <img
                  src={account.avatar}
                  className="w-9 h-9 rounded-full border border-gray-200 shadow-sm"
                  alt="Avatar"
                />
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-gray-100 hover:border-red-100"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z"
                />
              </svg>
              <span>退出</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-3 flex flex-col gap-4 sticky top-24 max-h-[calc(100vh-120px)]">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm overflow-y-auto custom-scrollbar max-h-[40vh]">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">
                历史回顾
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedMonth(null);
                    setSelectedDate(null);
                    setAppliedSearchQuery("");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                    !selectedMonth &&
                    !appliedSearchQuery &&
                    !selectedDate &&
                    !filterStartDate &&
                    !filterEndDate
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>全部已加载</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      !selectedMonth && !appliedSearchQuery && !selectedDate
                        ? "bg-indigo-500"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {statuses.length}
                  </span>
                </button>
                {timelineGroups.map(([key, group]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedMonth(key);
                      setSelectedDate(null);
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setAppliedSearchQuery("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                      selectedMonth === key
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{group.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        selectedMonth === key
                          ? "bg-indigo-500"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {group.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">
                按日期范围筛选
              </h3>
              <div className="space-y-2 px-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400">起始日期</span>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-full text-xs px-2 py-2 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400">结束日期</span>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-full text-xs px-2 py-2 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  />
                </div>
                <button
                  onClick={() => {
                    setFilterStartDate(tempStartDate);
                    setFilterEndDate(tempEndDate);
                    setSelectedDate(null);
                    setSelectedMonth(null);
                  }}
                  disabled={!tempStartDate && !tempEndDate}
                  className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认筛选范围
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleExploreMore(3)}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                  isLoading
                    ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                    : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm"
                }`}
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                )}
                探索更多 3 个月历史
              </button>
              <button
                onClick={handleFetchAllHistory}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                  isLoading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                }`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                抓取全部历史记录
              </button>
            </div>
          </aside>

          <section className="lg:col-span-6 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {appliedSearchQuery
                      ? "搜索结果"
                      : selectedDate
                      ? `${selectedDate} 的动态`
                      : selectedMonth
                      ? timelineGroups.find((g) => g[0] === selectedMonth)?.[1]
                          .label
                      : filterStartDate || filterEndDate
                      ? "日期范围筛选"
                      : "动态概览"}
                  </h2>
                  {(selectedDate ||
                    selectedMonth ||
                    appliedSearchQuery ||
                    filterStartDate ||
                    filterEndDate) && (
                    <button
                      onClick={() => {
                        setSelectedDate(null);
                        setSelectedMonth(null);
                        setAppliedSearchQuery("");
                        setSearchInputValue("");
                        setFilterStartDate("");
                        setFilterEndDate("");
                      }}
                      className="text-[10px] text-indigo-500 font-bold mt-1 hover:underline text-left flex items-center gap-1"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      清除当前筛选
                    </button>
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAppliedSearchQuery(searchInputValue);
                  }}
                  className="relative w-full sm:w-64"
                >
                  <input
                    type="text"
                    placeholder="输入关键词按回车搜索..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={searchInputValue}
                    onChange={(e) => setSearchInputValue(e.target.value)}
                  />
                  <svg
                    className="w-4 h-4 absolute left-4 top-2.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </form>
              </div>
            </div>

            {isLoading && statuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium text-sm tracking-wide animate-pulse">
                  正在同步动态 ({fetchCount})...
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredStatuses.map((status) => (
                  <StatusCard key={status.id} status={status} />
                ))}
                {filteredStatuses.length === 0 && !isLoading && (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-400 text-sm">
                      {appliedSearchQuery
                        ? `未找到包含 "${appliedSearchQuery}" 的动态`
                        : "此筛选条件下没有任何嘟文。"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="lg:col-span-3 flex flex-col gap-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            <div onClick={() => setIsHeatmapModalOpen(true)}>
              <ActivityHeatmap
                data={activityData}
                startDateProp={oldestTootDate}
                endDateProp={lastTootDate}
              />
            </div>
            {!hasReadStatuses && (
              <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg animate-in slide-in-from-right-4 duration-500">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  权限状态提示
                </h4>
                <p className="text-xs text-indigo-100 leading-relaxed">
                  当前仅同步了公开嘟文。如果您想查看隐藏或仅关注者可见的动态，请确保令牌包含{" "}
                  <code className="bg-indigo-800 px-1 rounded">
                    read:statuses
                  </code>{" "}
                  权限并重新登录。
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {isHeatmapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  活跃足迹全景
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  点击色块过滤对应日期的嘟文
                </p>
              </div>
              <button
                onClick={() => setIsHeatmapModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-8 overflow-auto max-h-[80vh]">
              <ActivityHeatmap
                data={activityData}
                startDateProp={oldestTootDate}
                endDateProp={lastTootDate}
                onCellClick={(date) => {
                  setSelectedDate(date);
                  setSelectedMonth(null);
                  setIsHeatmapModalOpen(false);
                }}
                isLarge={true}
              />
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsHeatmapModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                关闭视图
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-[50] p-4 bg-indigo-600 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:bg-indigo-700 hover:scale-110 ${
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10 pointer-events-none"
        }`}
        aria-label="回到顶部"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>

      <footer className="bg-white border-t border-gray-200 py-10 text-center mt-12">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">
          Built with D3.js • Mastodon Activity Explorer
        </p>
      </footer>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }`}</style>
    </div>
  );
};

export default App;
