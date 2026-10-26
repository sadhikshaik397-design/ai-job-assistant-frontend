import { useEffect, useState } from "react";

const API = "http://localhost:8080";
const PROFILE_ID = 1; // Used only until the profile has loaded.

const COMMON_SKILLS = [
  "spring boot",
  "machine learning",
  "data analysis",
  "javascript",
  "typescript",
  "postgresql",
  "mongodb",
  "microservices",
  "graphql",
  "rest api",
  "node.js",
  "express",
  "angular",
  "python",
  "django",
  "flask",
  "fastapi",
  "java",
  "react",
  "html",
  "css",
  "sql",
  "mysql",
  "redis",
  "docker",
  "kubernetes",
  "github",
  "git",
  "aws",
  "azure",
  "c++",
  "c#",
  "pandas",
  "numpy",
  "linux",
  "vue",
  "spring",
  "devops",
  "communication",
  "software development",
  "algorithms",
  "lambda",
  "kafka",
  "openapi",
  "serverless",
];

const SKILL_ALIASES = {
  "react.js": "react",
  reactjs: "react",
  nodejs: "node.js",
  node: "node.js",
  js: "javascript",
  ts: "typescript",
  springboot: "spring boot",
  postgres: "postgresql",
  "mongo db": "mongodb",
  html5: "html",
  css3: "css",
  cpp: "c++",
  csharp: "c#",
  "amazon web services": "aws",
  "microsoft azure": "azure",
};

function normalizeSkill(skill) {
  const normalized = String(skill || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return SKILL_ALIASES[normalized] || normalized;
}

function asSkillArray(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n|]/)
      : [];

  return [
    ...new Set(
      values
        .filter((skill) => typeof skill === "string")
        .map((skill) => skill.trim())
        .filter(Boolean)
    ),
  ];
}

function extractJobSkills(job) {
  const text = [
    job?.title || job?.jobTitle || "",
    job?.description || "",
    job?.skills || "",
  ]
    .join(" ")
    .toLowerCase();

  const detected = new Set();

  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(
      /[.*+?^${}()|[\]\\]/g,
      String.raw`\$&`
    );

    const pattern = new RegExp(
      `(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`,
      "i"
    );

    if (pattern.test(text)) {
      detected.add(normalizeSkill(skill));
    }
  }

  if (detected.has("spring boot")) {
    detected.delete("spring");
  }

  return [...detected];
}

function normalizeJob(job) {
  return {
    ...job,
    id: job.id ?? job.jobId,
    title: job.title ?? job.jobTitle ?? "Unknown Job",
    company: job.company ?? "Unknown Company",
    location: job.location ?? "Location not specified",
    skills: job.skills ?? "",
    salary: job.salary ?? "Not specified",
    jobUrl: job.jobUrl ?? job.redirect_url ?? "",
    description: job.description ?? "",
  };
}

async function readResponse(response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      text || `Request failed with HTTP ${response.status}`
    );
  }

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem("jobAssistantToken");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

function getRecommendation(result) {
  if (!result) return "Not evaluated";
  if (result.recommendation) return result.recommendation;

  const score = Number(result.matchScore) || 0;

  if (score >= 80) return "Excellent Match";
  if (score >= 60) return "Good Match";
  if (score >= 40) return "Moderate Match";

  return "Low Match";
}

function getBadgeStyle(score) {
  if (score >= 80) {
    return { background: "#dcfce7", color: "#166534" };
  }

  if (score >= 60) {
    return { background: "#fef9c3", color: "#854d0e" };
  }

  if (score >= 40) {
    return { background: "#ffedd5", color: "#9a3412" };
  }

  return { background: "#fee2e2", color: "#991b1b" };
}

function getStatusStyle(status) {
  const statusStyles = {
    SELECTED: { color: "green", fontWeight: "bold" },
    INTERVIEW: { color: "blue", fontWeight: "bold" },
    SHORTLISTED: { color: "orange", fontWeight: "bold" },
    REJECTED: { color: "red", fontWeight: "bold" },
  };

  return statusStyles[status] || {
    color: "gray",
    fontWeight: "bold",
  };
}

function formatDate(date) {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleString();
}

function getUniqueJobs(jobs) {
  const seen = new Set();

  return jobs.filter((job) => {
    const key = [
      job.title,
      job.company,
      job.location,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getResultMessage(result) {
  if (typeof result === "string") {
    return result.trim();
  }

  return result?.message || "";
}

function getSkillChipStyle(type) {
  if (type === "matched") return styles.matchedChip;
  if (type === "missing") return styles.missingChip;

  return styles.neutralChip;
}

// REQUIRED / PREFERRED SKILLS

function SkillList({
  matched = [],
  missing = [],
  allSkills = [],
}) {
  const matchedSkills = asSkillArray(matched);
  const missingSkills = asSkillArray(missing);
  const detectedSkills = asSkillArray(allSkills);

  const hasSkills =
    matchedSkills.length > 0 ||
    missingSkills.length > 0 ||
    detectedSkills.length > 0;

  if (!hasSkills) {
    return (
      <p style={styles.mutedText}>
        No skills detected for this category.
      </p>
    );
  }

  return (
    <div style={styles.skillList}>
      {matchedSkills.map((skill) => (
        <span
          key={`matched-${skill}`}
          style={styles.matchedChip}
        >
          ✓ {skill}
        </span>
      ))}

      {missingSkills.map((skill) => (
        <span
          key={`missing-${skill}`}
          style={styles.missingChip}
        >
          ✕ {skill}
        </span>
      ))}

      {detectedSkills.length > 0 &&
        matchedSkills.length === 0 &&
        missingSkills.length === 0 &&
        detectedSkills.map((skill) => (
          <span
            key={`detected-${skill}`}
            style={styles.neutralChip}
          >
            {skill}
          </span>
        ))}
    </div>
  );
}

// SKILL CHIPS

function SkillChips({
  skills = [],
  emptyText = "No skills found.",
  type = "neutral",
}) {
  const skillArray = asSkillArray(skills);

  if (skillArray.length === 0) {
    return <p style={styles.mutedText}>{emptyText}</p>;
  }

  const chipStyle = getSkillChipStyle(type);

  return (
    <div style={styles.skillList}>
      {skillArray.map((skill) => (
        <span key={skill} style={chipStyle}>
          {skill}
        </span>
      ))}
    </div>
  );
}

function App() {
  const [authMode, setAuthMode] = useState("login");

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("jobAssistantToken"))
  );

  const [loggedInUsername, setLoggedInUsername] = useState(
    () => localStorage.getItem("jobAssistantUsername") || ""
  );

  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");

  const [jobs, setJobs] = useState([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [matchResults, setMatchResults] = useState({});
  const [resume, setResume] = useState("");

  const [applications, setApplications] = useState([]);
  const [applicationJobs, setApplicationJobs] = useState({});
  const [profile, setProfile] = useState(null);

  const [expandedJob, setExpandedJob] = useState(null);

  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  const [statusLoading, setStatusLoading] = useState({});
  const [matchingLoading, setMatchingLoading] = useState({});

  const [editApplication, setEditApplication] = useState(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [applicationUpdateLoading, setApplicationUpdateLoading] =
    useState(false);

  // LOGIN

  const handleLogin = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthMessage("");

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername.trim(),
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      const result = await readResponse(response);
      const message = getResultMessage(result);

      if (!response.ok || message !== "Login successful" || !result?.token) {
        setAuthMessage(message || "Login failed. Check your details.");
        return;
      }

      localStorage.setItem("jobAssistantToken", result.token);
      localStorage.setItem("jobAssistantLoggedIn", "true");
      localStorage.setItem(
        "jobAssistantUsername",
        result.username || authUsername.trim()
      );

      setLoggedInUsername(result.username || authUsername.trim());
      setIsLoggedIn(true);
      setAuthPassword("");
      setAuthMessage("");
    } catch (error) {
      console.error("Login error:", error);

      setAuthMessage(
        "Could not connect to Spring Boot. Check that the backend is running on port 8080."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // REGISTER

  const handleRegister = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthMessage("");

    try {
      const response = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername.trim(),
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      const result = await readResponse(response);
      const message = getResultMessage(result);

      if (!response.ok) {
        setAuthMessage(
          message || "Registration failed. Please try again."
        );
        return;
      }

      setAuthMode("login");
      setAuthPassword("");
      setAuthMessage(message || "Registration submitted. Follow the email verification instructions, then log in.");
    } catch (error) {
      console.error("Registration error:", error);

      setAuthMessage(
        "Could not connect to Spring Boot. Check that the backend is running on port 8080."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // LOGOUT

  const handleLogout = () => {
    const token = localStorage.getItem("jobAssistantToken");
    if (token) {
      void fetch(`${API}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch((error) => console.warn("Logout request failed:", error));
    }
    localStorage.removeItem("jobAssistantToken");
    localStorage.removeItem("jobAssistantLoggedIn");
    localStorage.removeItem("jobAssistantUsername");

    setIsLoggedIn(false);
    setLoggedInUsername("");
    setAuthUsername("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthMode("login");
    setAuthMessage("");

    setJobs([]);
    setApplications([]);
    setApplicationJobs({});
    setProfile(null);
    setMatchResults({});
    setAnalysis("");
    setResume("");
  };

  // LOAD SAVED JOBS

  const loadSavedJobs = async () => {
    const response = await apiFetch(`${API}/api/jobs`);
    const data = await readResponse(response);

    return Array.isArray(data)
      ? data.map(normalizeJob)
      : [];
  };

  // LOAD APPLICATIONS

  const loadApplications = async () => {
    setApplicationsLoading(true);

    try {
      const response = await apiFetch(`${API}/api/applications`);
      const data = await readResponse(response);

      const allApplications = Array.isArray(data) ? data : [];

      const applicationList = allApplications;

      setApplications(applicationList);

      // Fetch related jobs concurrently instead of awaiting inside a loop.
      const jobEntries = await Promise.all(
        applicationList.map(async (application) => {
          if (!application.jobId) return null;

          try {
            const jobResponse = await apiFetch(
              `${API}/api/jobs/${application.jobId}`
            );

            if (!jobResponse.ok) return null;

            const job = await readResponse(jobResponse);

            if (!job || typeof job !== "object") {
              return null;
            }

            return [
              application.jobId,
              normalizeJob(job),
            ];
          } catch (error) {
            console.warn(
              "Could not load application job:",
              error
            );

            return null;
          }
        })
      );

      const jobMap = {};

      for (const entry of jobEntries) {
        if (entry) {
          jobMap[entry[0]] = entry[1];
        }
      }

      setApplicationJobs(jobMap);
    } catch (error) {
      console.error("Applications error:", error);
      alert(`Unable to load applications: ${error.message}`);
    } finally {
      setApplicationsLoading(false);
    }
  };

  // LOAD PROFILE

  const loadProfile = async () => {
    setProfileLoading(true);

    try {
      const response = await apiFetch(`${API}/api/profile/me`);

      const data = await readResponse(response);

      if (!data || typeof data !== "object") {
        throw new Error("The profile API returned invalid data.");
      }

      setProfile(data);
      setTitle(data.preferredJobTitle || "");
      setSkills(data.skills || "");
      setLocation(data.preferredLocation || "");
    } catch (error) {
      console.error("Profile error:", error);
      alert(`Unable to load profile: ${error.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  // LOAD DASHBOARD DATA WITHOUT SETTING STATE DIRECTLY IN THE EFFECT.
  // The microtask schedules the work after the effect body completes.

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    let cancelled = false;

    const loadInitialData = async () => {
      if (cancelled) return;

      try {
        await Promise.all([
          loadApplications(),
          loadProfile(),
        ]);
      } catch (error) {
        console.error("Initial dashboard load error:", error);
      }
    };

    queueMicrotask(() => {
      if (!cancelled) {
        void loadInitialData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // SEARCH JOBS

  const searchJobs = async () => {
    setLoading(true);
    setJobs([]);
    setMatchResults({});
    setAnalysis("");
    setResume("");
    setExpandedJob(null);
    setSearchMessage("");

    const searchTitle = title.trim();
    const searchLocation = location.trim();
    const searchSkills = skills.trim();

    if (searchTitle.length < 2 || searchLocation.length < 2) {
      setSearchMessage(
        "Enter a job title and location (at least 2 characters each)."
      );
      setLoading(false);
      return;
    }

    try {
      let externalJobs = [];
      let externalSearchError = "";

      const params = new URLSearchParams({
        what: searchTitle,
        where: searchLocation,
      });

      try {
        const response = await apiFetch(
          `${API}/api/adzuna/search?${params.toString()}`
        );

        const data = await readResponse(response);

        if (Array.isArray(data?.results)) {
          externalJobs = data.results;
        } else {
          externalSearchError = "Adzuna returned an unexpected response.";
        }
      } catch (error) {
        externalSearchError = error.message || "Adzuna request failed.";
        console.warn("External job search failed:", externalSearchError);
      }

      // IMPORT EXTERNAL JOBS

      if (externalJobs.length > 0) {
        const importResults = await Promise.all(
          externalJobs.map(async (job) => {
            const jobData = {
              externalId: String(job.id ?? ""),
              title: job.title || "Unknown Job",
              company:
                job.company?.display_name || "Unknown Company",
              location:
                job.location?.display_name || searchLocation,

              // Extract skills from the job itself.
              skills: extractJobSkills({
                title: job.title,
                description: job.description,
              }).join(", "),

              salary:
                job.salary_min || job.salary_max
                  ? `${job.salary_min || 0} - ${job.salary_max || 0}`
                  : "Not specified",

              jobUrl:
                job.redirect_url || "https://www.adzuna.in/",

              description:
                job.description || "No description available",
            };

            try {
              const response = await apiFetch(
                `${API}/api/import/job`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(jobData),
                }
              );

              const imported = await readResponse(response);

              if (imported && typeof imported === "object") {
                return normalizeJob(imported);
              }
            } catch (error) {
              console.error("Job import error:", error);
            }

            return null;
          })
        );

        const importedJobs = getUniqueJobs(
          importResults.filter(Boolean)
        );

        if (importedJobs.length > 0) {
          setJobs(importedJobs);
          setSearchMessage(
            `Found ${importedJobs.length} unique external job(s).`
          );
          return;
        }
      }

      // FALL BACK TO SAVED DATABASE JOBS

      const savedJobs = await loadSavedJobs();

      const normalizedTitle = searchTitle.toLowerCase();
      const normalizedLocation = searchLocation.toLowerCase();

      const requestedSkills = asSkillArray(searchSkills).map(
        normalizeSkill
      );

      const filteredJobs = savedJobs.filter((job) => {
        const jobTitle = String(job.title || "").toLowerCase();
        const jobLocation = String(job.location || "").toLowerCase();

        const jobSkills = extractJobSkills(job).map(normalizeSkill);

        const titleMatches =
          !normalizedTitle ||
          jobTitle.includes(normalizedTitle) ||
          normalizedTitle.includes(jobTitle);

        const locationMatches =
          !normalizedLocation ||
          jobLocation.includes(normalizedLocation) ||
          normalizedLocation.includes(jobLocation);

        const skillsMatch =
          requestedSkills.length === 0 ||
          requestedSkills.some((skill) =>
            jobSkills.includes(skill)
          );

        return titleMatches && locationMatches && skillsMatch;
      });

      const uniqueSavedJobs = getUniqueJobs(filteredJobs);

      setJobs(uniqueSavedJobs);

      const fallbackReason = externalSearchError
        ? `Adzuna search failed (${externalSearchError}).`
        : externalJobs.length > 0
          ? "Adzuna returned jobs, but none could be imported."
          : "No external jobs found.";

      if (uniqueSavedJobs.length > 0) {
        setSearchMessage(
          `${fallbackReason} Showing ${uniqueSavedJobs.length} matching saved job(s) from your database.`
        );
      } else {
        setSearchMessage(
          `${fallbackReason} No matching saved jobs were found for "${searchTitle}" in "${searchLocation}".`
        );
      }
    } catch (error) {
      console.error("Job search error:", error);
      setSearchMessage(`Unable to search jobs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // AI JOB ANALYSIS

  const analyzeJob = async (jobId) => {
    try {
      const response = await apiFetch(
        `${API}/api/ai/analyze/${jobId}`
      );

      const result = await readResponse(response);

      setAnalysis(
        typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.error("AI analysis error:", error);
      alert(`Unable to analyze job: ${error.message}`);
    }
  };

  // CHECK MATCH

  const checkMatch = async (jobId) => {
    setMatchingLoading((previous) => ({
      ...previous,
      [jobId]: true,
    }));

    try {
      const response = await apiFetch(
        `${API}/api/matching/${profile?.id || PROFILE_ID}/${jobId}`
      );

      const data = await readResponse(response);

      if (!data || typeof data !== "object") {
        throw new Error("The matching API returned invalid data.");
      }

      const score = Number(data.matchScore);

      if (!Number.isFinite(score)) {
        throw new Error(
          "The matching API did not return a valid matchScore."
        );
      }

      setMatchResults((previous) => ({
        ...previous,
        [jobId]: {
          ...data,
          matchScore: score,

          recommendation:
            data.recommendation ||
            getRecommendation({ matchScore: score }),

          matchedSkills: asSkillArray(data.matchedSkills),
          missingSkills: asSkillArray(data.missingSkills),
          requiredSkills: asSkillArray(data.requiredSkills),
          preferredSkills: asSkillArray(data.preferredSkills),

          matchedRequiredSkills: asSkillArray(
            data.matchedRequiredSkills
          ),

          missingRequiredSkills: asSkillArray(
            data.missingRequiredSkills
          ),

          matchedPreferredSkills: asSkillArray(
            data.matchedPreferredSkills
          ),

          missingPreferredSkills: asSkillArray(
            data.missingPreferredSkills
          ),

          detectedSkills: [
            ...new Set([
              ...asSkillArray(data.matchedSkills),
              ...asSkillArray(data.missingSkills),
              ...asSkillArray(data.requiredSkills),
              ...asSkillArray(data.preferredSkills),
            ]),
          ],

          experienceMatchMessage:
            data.experienceMatchMessage ||
            data.experienceMatch ||
            "",
        },
      }));
    } catch (error) {
      console.error("Match error:", error);
      alert(`Unable to check job match: ${error.message}`);
    } finally {
      setMatchingLoading((previous) => ({
        ...previous,
        [jobId]: false,
      }));
    }
  };

  // GENERATE TAILORED RESUME

  const generateResume = async (jobId) => {
    setResumeLoading(true);

    try {
      const response = await apiFetch(
        `${API}/api/resume/tailor/${profile?.id || PROFILE_ID}/${jobId}`
      );

      const result = await readResponse(response);

      setResume(
        typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.error("Resume error:", error);
      alert(`Unable to generate resume: ${error.message}`);
    } finally {
      setResumeLoading(false);
    }
  };

  // TRACK APPLICATION

  const applyForJob = async (jobId) => {
    setApplicationLoading(true);

    try {
      const response = await apiFetch(`${API}/api/applications`);
      const existingApplications = await readResponse(response);

      const applicationList = Array.isArray(existingApplications)
        ? existingApplications
        : [];

      const alreadyApplied = applicationList.some(
        (application) =>
          Number(application.profileId) === Number(profile?.id || PROFILE_ID) &&
          Number(application.jobId) === Number(jobId)
      );

      if (alreadyApplied) {
        await loadApplications();
        alert("You have already tracked this job.");
        return;
      }

      const createResponse = await apiFetch(
        `${API}/api/applications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile?.id || PROFILE_ID,
            jobId: Number(jobId),
            status: "APPLIED",
            appliedDate: new Date().toISOString(),
          }),
        }
      );

      const application = await readResponse(createResponse);

      if (!application || typeof application !== "object") {
        throw new Error("The backend did not return the application.");
      }

      await loadApplications();

      alert("Application tracked successfully.");
    } catch (error) {
      console.error("Application error:", error);
      alert(`Unable to track application: ${error.message}`);
    } finally {
      setApplicationLoading(false);
    }
  };

  // UPDATE APPLICATION STATUS

  const updateApplicationStatus = async (
    applicationId,
    status
  ) => {
    setStatusLoading((previous) => ({
      ...previous,
      [applicationId]: true,
    }));

    try {
      const response = await apiFetch(
        `${API}/api/applications/${applicationId}/status?status=${encodeURIComponent(status)}`,
        { method: "PUT" }
      );

      const updatedApplication = await readResponse(response);

      if (
        !updatedApplication ||
        typeof updatedApplication !== "object"
      ) {
        throw new Error(
          "The backend returned invalid application data."
        );
      }

      setApplications((previous) =>
        previous.map((application) =>
          Number(application.id) === Number(applicationId)
            ? updatedApplication
            : application
        )
      );
    } catch (error) {
      console.error("Status update error:", error);
      alert(`Unable to update status: ${error.message}`);
    } finally {
      setStatusLoading((previous) => ({
        ...previous,
        [applicationId]: false,
      }));
    }
  };

  // EDIT APPLICATION DETAILS

  const startEditingApplication = (application) => {
    setEditApplication(application);

    setInterviewDate(
      application.interviewDate
        ? application.interviewDate.slice(0, 16)
        : ""
    );

    setNotes(application.notes || "");
  };

  const cancelEditingApplication = () => {
    setEditApplication(null);
    setInterviewDate("");
    setNotes("");
  };

  // SAVE APPLICATION DETAILS

  const saveApplicationDetails = async () => {
    if (!editApplication) return;

    setApplicationUpdateLoading(true);

    try {
      const response = await apiFetch(
        `${API}/api/applications/${editApplication.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: editApplication.profileId,
            jobId: editApplication.jobId,
            status: editApplication.status,
            appliedDate: editApplication.appliedDate,

            interviewDate: interviewDate
              ? new Date(interviewDate).toISOString()
              : null,

            notes,
          }),
        }
      );

      const updatedApplication = await readResponse(response);

      if (
        !updatedApplication ||
        typeof updatedApplication !== "object"
      ) {
        throw new Error(
          "The backend returned invalid application data."
        );
      }

      setApplications((previous) =>
        previous.map((application) =>
          Number(application.id) ===
          Number(updatedApplication.id)
            ? updatedApplication
            : application
        )
      );

      cancelEditingApplication();

      alert("Application details updated successfully.");
    } catch (error) {
      console.error("Application details error:", error);
      alert(`Unable to update application: ${error.message}`);
    } finally {
      setApplicationUpdateLoading(false);
    }
  };

  // DELETE APPLICATION

  const deleteApplication = async (applicationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `${API}/api/applications/${applicationId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setApplications((previous) =>
        previous.filter(
          (application) =>
            Number(application.id) !== Number(applicationId)
        )
      );

      if (
        Number(editApplication?.id) === Number(applicationId)
      ) {
        cancelEditingApplication();
      }

      alert("Application deleted successfully.");
    } catch (error) {
      console.error("Delete application error:", error);
      alert(`Unable to delete application: ${error.message}`);
    }
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // DASHBOARD STATISTICS

  const totalApplications = applications.length;

  const shortlistedApplications = applications.filter(
    (application) => application.status === "SHORTLISTED"
  ).length;

  const interviewApplications = applications.filter(
    (application) => application.status === "INTERVIEW"
  ).length;

  const selectedApplications = applications.filter(
    (application) => application.status === "SELECTED"
  ).length;

  const rejectedApplications = applications.filter(
    (application) => application.status === "REJECTED"
  ).length;

  // LOGIN / REGISTER PAGE

  if (!isLoggedIn) {
    return (
      <div style={styles.authPage}>
        <form
          onSubmit={
            authMode === "login" ? handleLogin : handleRegister
          }
          style={styles.authCard}
        >
          <h1 style={{ marginTop: 0, textAlign: "center" }}>
            🤖 AI Job Assistant
          </h1>

          <p style={styles.mutedText}>
            {authMode === "login"
              ? "Log in to continue"
              : "Create your account"}
          </p>

          <label style={styles.label} htmlFor="auth-username">
            Username
          </label>

          <input
            id="auth-username"
            required
            autoComplete="username"
            value={authUsername}
            onChange={(event) =>
              setAuthUsername(event.target.value)
            }
            style={styles.input}
          />

          <label style={styles.label} htmlFor="auth-email">
            Email
          </label>

          <input
            id="auth-email"
            required
            type="email"
            autoComplete="email"
            value={authEmail}
            onChange={(event) =>
              setAuthEmail(event.target.value)
            }
            style={styles.input}
          />

          <label style={styles.label} htmlFor="auth-password">
            Password
          </label>

          <input
            id="auth-password"
            required
            type="password"
            autoComplete={
              authMode === "login"
                ? "current-password"
                : "new-password"
            }
            value={authPassword}
            onChange={(event) =>
              setAuthPassword(event.target.value)
            }
            style={styles.input}
          />

          {authMessage && (
            <p
              role="status"
              style={{
                color: authMessage
                  .toLowerCase()
                  .includes("successful")
                  ? "green"
                  : "#b42318",
                lineHeight: 1.5,
              }}
            >
              {authMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={styles.primaryButton}
          >
            {authLoading
              ? "Please wait..."
              : authMode === "login"
                ? "Login"
                : "Register"}
          </button>

          <p style={{ textAlign: "center" }}>
            {authMode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setAuthMessage("");
              }}
              style={styles.linkButton}
            >
              {authMode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </form>
      </div>
    );
  }

  // MAIN DASHBOARD

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>🤖 AI Job Assistant</h1>

        <div style={styles.headerActions}>
          <span style={styles.mutedText}>
            Welcome, {loggedInUsername}
          </span>

          <button
            onClick={handleLogout}
            style={styles.dangerButton}
          >
            Logout
          </button>
        </div>
      </header>

      <p>
        Search jobs, analyze requirements, check your match,
        generate a tailored resume, and manage applications.
      </p>

      <hr />

      <h2>📊 Dashboard</h2>

      <button
        onClick={() => {
          void loadApplications();
          void loadProfile();
        }}
        disabled={applicationsLoading || profileLoading}
        style={styles.button}
      >
        {applicationsLoading || profileLoading
          ? "Refreshing..."
          : "Refresh Dashboard"}
      </button>

      <div style={styles.statsGrid}>
        {[
          ["💼 Jobs", jobs.length],
          ["📝 Applications", totalApplications],
          ["⭐ Shortlisted", shortlistedApplications],
          ["🎯 Interviews", interviewApplications],
          ["✅ Selected", selectedApplications],
          ["❌ Rejected", rejectedApplications],
        ].map(([label, value]) => (
          <div key={label} style={styles.statCard}>
            <h3>{label}</h3>
            <h2>{value}</h2>
          </div>
        ))}
      </div>

      <hr />

      <h2>🔎 Search Jobs</h2>

      <div style={styles.searchForm}>
        <input
          type="text"
          placeholder="Job title (e.g. Python Developer)"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={styles.input}
        />

        <input
          type="text"
          placeholder="Location (e.g. Hyderabad)"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          style={styles.input}
        />

        <input
          type="text"
          placeholder="Skills (e.g. Python, React, SQL)"
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          style={styles.input}
        />

        <button
          onClick={searchJobs}
          disabled={loading}
          style={styles.primaryButton}
        >
          {loading ? "Searching..." : "Search Jobs"}
        </button>
      </div>

      {searchMessage && (
        <p role="status" style={styles.mutedText}>
          {searchMessage}
        </p>
      )}

      <hr />

      <h2>👤 My Profile</h2>

      <button
        onClick={loadProfile}
        disabled={profileLoading}
        style={styles.button}
      >
        {profileLoading ? "Loading Profile..." : "Load Profile"}
      </button>

      {profile && (
        <div style={styles.panel}>
          <p>
            <strong>Name:</strong> {profile.name}
          </p>

          <p>
            <strong>Education:</strong> {profile.education}
          </p>

          <p>
            <strong>Skills:</strong>
          </p>

          <SkillChips
            skills={profile.skills}
            emptyText="No profile skills available."
          />

          <p>
            <strong>Experience:</strong> {profile.experience}
          </p>

          <p>
            <strong>Preferred Location:</strong>{" "}
            {profile.preferredLocation}
          </p>

          <p>
            <strong>Preferred Job Title:</strong>{" "}
            {profile.preferredJobTitle}
          </p>
        </div>
      )}

      <hr />

      <h2>💼 Job Results</h2>

      {jobs.length === 0 && !loading && (
        <p>
          No jobs are currently displayed. Search above to load jobs.
        </p>
      )}

      {loading && (
        <p role="status" style={styles.mutedText}>
          Searching external jobs and your saved database jobs...
        </p>
      )}

      {jobs.map((job) => {
        const result = matchResults[job.id];
        const detectedSkills = result
          ? result.detectedSkills || []
          : extractJobSkills(job);

        const alreadyApplied = applications.some(
          (application) =>
            Number(application.profileId) === Number(profile?.id || PROFILE_ID) &&
            Number(application.jobId) === Number(job.id)
        );

        const score = Number(result?.matchScore) || 0;

        return (
          <article key={job.id} style={styles.jobCard}>
            <h3>{job.title}</h3>

            <p>
              <strong>Company:</strong> {job.company}
            </p>

            <p>
              <strong>Location:</strong> {job.location}
            </p>

            <p>
              <strong>Detected Job Skills:</strong>
            </p>

            <SkillChips
              skills={detectedSkills}
              emptyText="No recognized skills found in this job description."
            />

            <p>
              <strong>Salary:</strong>{" "}
              {job.salary || "Not specified"}
            </p>

            {expandedJob === job.id && (
              <p style={styles.description}>
                <strong>Description:</strong>{" "}
                {job.description || "No description available"}
              </p>
            )}

            <div style={styles.actionRow}>
              <button
                onClick={() =>
                  setExpandedJob(
                    expandedJob === job.id ? null : job.id
                  )
                }
                style={styles.button}
              >
                {expandedJob === job.id
                  ? "Hide Details"
                  : "View Details"}
              </button>

              <button
                onClick={() => analyzeJob(job.id)}
                style={styles.button}
              >
                🤖 Analyze Job
              </button>

              <button
                onClick={() => checkMatch(job.id)}
                disabled={Boolean(matchingLoading[job.id])}
                style={styles.primaryButton}
              >
                {matchingLoading[job.id]
                  ? "Checking..."
                  : "🎯 Check Match"}
              </button>

              <button
                onClick={() => generateResume(job.id)}
                disabled={resumeLoading}
                style={styles.button}
              >
                {resumeLoading
                  ? "Generating..."
                  : "📄 Generate Resume"}
              </button>

              <button
                onClick={() =>
                  window.open(
                    job.jobUrl || "https://www.adzuna.in/",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                style={styles.button}
              >
                🔗 View Job
              </button>

              <button
                onClick={() => applyForJob(job.id)}
                disabled={applicationLoading || alreadyApplied}
                style={styles.primaryButton}
              >
                {alreadyApplied
                  ? "✅ Already Tracked"
                  : applicationLoading
                    ? "Saving..."
                    : "🚀 Track Application"}
              </button>
            </div>

            {matchingLoading[job.id] && (
              <p role="status" style={styles.mutedText}>
                Checking your skills against this job...
              </p>
            )}

            {result && (
              <div style={styles.matchPanel}>
                <div style={styles.matchHeader}>
                  <div>
                    <span style={styles.mutedText}>
                      Job compatibility
                    </span>

                    <h2 style={styles.scoreHeading}>
                      {score}%
                    </h2>
                  </div>

                  <span
                    style={{
                      ...styles.badge,
                      ...getBadgeStyle(score),
                    }}
                  >
                    {getRecommendation(result)}
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Job compatibility score"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.max(
                    0,
                    Math.min(100, score)
                  )}
                  style={styles.progressTrack}
                >
                  <div
                    style={{
                      ...styles.progressBar,
                      width: `${Math.max(
                        0,
                        Math.min(100, score)
                      )}%`,
                    }}
                  />
                </div>

                <h4>Required Skills</h4>

                <SkillList
                  matched={result.matchedRequiredSkills}
                  missing={result.missingRequiredSkills}
                  allSkills={result.requiredSkills}
                />

                <h4>Preferred Skills</h4>

                <SkillList
                  matched={result.matchedPreferredSkills}
                  missing={result.missingPreferredSkills}
                  allSkills={result.preferredSkills}
                />

                <h4>All Matched Skills</h4>

                <SkillChips
                  skills={result.matchedSkills}
                  emptyText="No matching skills found."
                  type="matched"
                />

                <h4>All Missing Skills</h4>

                <SkillChips
                  skills={result.missingSkills}
                  emptyText="No missing skills detected."
                  type="missing"
                />

                {result.experienceMatchMessage && (
                  <p style={styles.warningMessage}>
                    <strong>Experience:</strong>{" "}
                    {result.experienceMatchMessage}
                  </p>
                )}

                {result.requiredSkills.length === 0 &&
                  result.preferredSkills.length === 0 && (
                    <p style={styles.warningMessage}>
                      The backend did not identify separate required
                      and preferred skills for this job. Review the job
                      description before relying on the score.
                    </p>
                  )}
              </div>
            )}
          </article>
        );
      })}

      {analysis && (
        <>
          <hr />
          <h2>🤖 AI Job Analysis</h2>
          <div style={styles.panel}>{analysis}</div>
        </>
      )}

      {resume && (
        <>
          <hr />
          <h2>📄 Tailored Resume</h2>
          <div style={styles.panel}>{resume}</div>
        </>
      )}

      <hr />

      <h2 id="applications">📋 My Applications</h2>

      <button
        onClick={loadApplications}
        disabled={applicationsLoading}
        style={styles.button}
      >
        {applicationsLoading ? "Loading..." : "Load Applications"}
      </button>

      {applications.length === 0 && !applicationsLoading && (
        <p>No applications found.</p>
      )}

      {applications.map((application) => {
        const job = applicationJobs[application.jobId];

        return (
          <article
            key={application.id}
            style={styles.jobCard}
          >
            <h3>
              {job
                ? job.title
                : `Job ID: ${application.jobId}`}
            </h3>

            {job && (
              <>
                <p>
                  <strong>Company:</strong> {job.company}
                </p>

                <p>
                  <strong>Location:</strong> {job.location}
                </p>

                <p>
                  <strong>Salary:</strong> {job.salary}
                </p>
              </>
            )}

            <p>
              <strong>Status:</strong>{" "}
              <span style={getStatusStyle(application.status)}>
                {application.status}
              </span>
            </p>

            <p>
              <strong>Applied Date:</strong>{" "}
              {formatDate(application.appliedDate)}
            </p>

            {application.interviewDate && (
              <p>
                <strong>Interview Date:</strong>{" "}
                {formatDate(application.interviewDate)}
              </p>
            )}

            {application.notes && (
              <p>
                <strong>Notes:</strong> {application.notes}
              </p>
            )}

            <label htmlFor={`status-${application.id}`}>
              <strong>Change Status:</strong>
            </label>

            <select
              id={`status-${application.id}`}
              value={application.status || "APPLIED"}
              disabled={Boolean(statusLoading[application.id])}
              onChange={(event) =>
                updateApplicationStatus(
                  application.id,
                  event.target.value
                )
              }
              style={{ ...styles.input, maxWidth: "220px" }}
            >
              <option value="APPLIED">APPLIED</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="INTERVIEW">INTERVIEW</option>
              <option value="SELECTED">SELECTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            <div style={styles.actionRow}>
              <button
                onClick={() =>
                  startEditingApplication(application)
                }
                style={styles.button}
              >
                ✏️ Edit Interview Details
              </button>

              <button
                onClick={() =>
                  deleteApplication(application.id)
                }
                style={styles.dangerButton}
              >
                🗑️ Delete Application
              </button>
            </div>

            {Number(editApplication?.id) ===
              Number(application.id) && (
              <div style={styles.panel}>
                <label
                  htmlFor={`interview-date-${application.id}`}
                >
                  <strong>Interview Date:</strong>
                </label>

                <input
                  id={`interview-date-${application.id}`}
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(event) =>
                    setInterviewDate(event.target.value)
                  }
                  style={styles.input}
                />

                <label
                  htmlFor={`application-notes-${application.id}`}
                >
                  <strong>Notes:</strong>
                </label>

                <textarea
                  id={`application-notes-${application.id}`}
                  rows="4"
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Add interview notes..."
                  style={styles.input}
                />

                <div style={styles.actionRow}>
                  <button
                    onClick={saveApplicationDetails}
                    disabled={applicationUpdateLoading}
                    style={styles.primaryButton}
                  >
                    {applicationUpdateLoading
                      ? "Saving..."
                      : "💾 Save"}
                  </button>

                  <button
                    onClick={cancelEditingApplication}
                    style={styles.button}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}

      <hr />

      <button
        onClick={() => scrollToSection("applications")}
        style={styles.button}
      >
        My Applications
      </button>
    </div>
  );
}

const styles = {
  authPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "#f3f6fb",
    fontFamily: "Arial, sans-serif",
  },

  authCard: {
    width: "100%",
    maxWidth: "420px",
    padding: "32px",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
  },

  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    color: "#172033",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  mutedText: {
    color: "#596579",
  },

  label: {
    display: "block",
    marginTop: "16px",
    fontWeight: "bold",
  },

  input: {
    boxSizing: "border-box",
    width: "100%",
    padding: "12px",
    marginTop: "7px",
    marginBottom: "10px",
    border: "1px solid #ccd3df",
    borderRadius: "8px",
    fontSize: "14px",
  },

  primaryButton: {
    padding: "11px 15px",
    border: 0,
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  dangerButton: {
    padding: "9px 14px",
    border: 0,
    borderRadius: "7px",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
  },

  button: {
    padding: "10px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    background: "white",
    color: "#172033",
    cursor: "pointer",
  },

  linkButton: {
    border: 0,
    padding: 0,
    background: "none",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "bold",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  statCard: {
    padding: "20px",
    border: "1px solid #dbe2ea",
    borderRadius: "10px",
    textAlign: "center",
    background: "#f8fafc",
  },

  searchForm: {
    display: "grid",
    gap: "10px",
    maxWidth: "600px",
  },

  panel: {
    border: "1px solid #dbe2ea",
    padding: "18px",
    marginTop: "15px",
    borderRadius: "10px",
    background: "#f8fafc",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },

  description: {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    lineHeight: 1.6,
  },

  jobCard: {
    border: "1px solid #dbe2ea",
    padding: "20px",
    marginBottom: "15px",
    borderRadius: "12px",
    background: "white",
    boxShadow: "0 3px 12px rgba(15,23,42,0.04)",
  },

  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "15px",
    marginBottom: "10px",
  },

  matchPanel: {
    marginTop: "18px",
    padding: "18px",
    background: "#f8fafc",
    border: "1px solid #dbe2ea",
    borderRadius: "10px",
  },

  matchHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  scoreHeading: {
    margin: "5px 0",
    fontSize: "32px",
  },

  badge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "20px",
    fontWeight: "bold",
  },

  progressTrack: {
    height: "10px",
    margin: "12px 0 20px",
    background: "#e2e8f0",
    borderRadius: "20px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background: "#2563eb",
    borderRadius: "20px",
    transition: "width 0.3s ease",
  },

  skillList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "14px",
  },

  matchedChip: {
    padding: "6px 10px",
    borderRadius: "20px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "13px",
  },

  missingChip: {
    padding: "6px 10px",
    borderRadius: "20px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: "13px",
  },

  neutralChip: {
    padding: "6px 10px",
    borderRadius: "20px",
    background: "#e2e8f0",
    color: "#334155",
    fontSize: "13px",
  },

  warningMessage: {
    padding: "12px",
    borderRadius: "8px",
    background: "#fef3c7",
    color: "#92400e",
    lineHeight: 1.5,
  },
};

export default App;
