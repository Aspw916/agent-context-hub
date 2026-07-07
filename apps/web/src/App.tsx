import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import AgentsPage from "./pages/AgentsPage";
import SkillsPage from "./pages/SkillsPage";
import McpPage from "./pages/McpPage";
import ExpertsPage from "./pages/ExpertsPage";
import EventsPage from "./pages/EventsPage";
import SettingsPage from "./pages/SettingsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ContextPage from "./pages/ContextPage";
import ArtifactsPage from "./pages/ArtifactsPage";
import SearchPage from "./pages/SearchPage";
import AgentDetailPage from "./pages/AgentDetailPage";
import SkillDetailPage from "./pages/SkillDetailPage";
import McpDetailPage from "./pages/McpDetailPage";
import ExpertDetailPage from "./pages/ExpertDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:id" element={<AgentDetailPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="skills/:id" element={<SkillDetailPage />} />
        <Route path="mcp-servers" element={<McpPage />} />
        <Route path="mcp-servers/:id" element={<McpDetailPage />} />
        <Route path="experts" element={<ExpertsPage />} />
        <Route path="experts/:id" element={<ExpertDetailPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="context" element={<ContextPage />} />
        <Route path="artifacts" element={<ArtifactsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<OverviewPage />} />
      </Route>
    </Routes>
  );
}
