import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ZoomIn,
  ZoomOut,
  Building2,
  Download,
  RotateCcw,
  Edit2,
  Plus,
  Trash2,
  Save,
  X,
  Check,
} from '@/components/ui/icons';
import { UserAvatar } from '../UserAvatar';
import { supabase } from '@/lib/supabaseClient';
import {
  OrgNode,
  INITIAL_ORG_DATA,
  loadSavedOrgData,
  saveOrgData,
} from '../../lib/organizationStructureStorage';

export const OrganizationStructurePage: React.FC = () => {
  const [data, setData] = useState(loadSavedOrgData);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'canvas' | 'pdf'>('canvas');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map());

  // Edit Modal State
  const [editingNode, setEditingNode] = useState<{
    id: string;
    name: string;
    title: string;
    paName?: string;
    paTitle?: string;
    parentId?: string;
    isNew?: boolean;
    section?: 'top' | 'left' | 'right';
  } | null>(null);

  // Fetch all user accounts avatars from Supabase user_accounts
  useEffect(() => {
    let isMounted = true;
    const fetchAvatars = async () => {
      try {
        const { data: users, error } = await supabase
          .from('user_accounts')
          .select('full_name, nickname, avatar_url');
        if (error) {
          console.warn('Failed to load user avatars for org chart:', error);
          return;
        }
        if (users && isMounted) {
          const map = new Map<string, string>();
          users.forEach((u: any) => {
            if (u.avatar_url) {
              if (u.full_name) {
                map.set(u.full_name.trim().toLowerCase(), u.avatar_url);
              }
              if (u.nickname) {
                map.set(u.nickname.trim().toLowerCase(), u.avatar_url);
              }
            }
          });
          setAvatarMap(map);
        }
      } catch (err) {
        console.warn('Error fetching avatars:', err);
      }
    };

    fetchAvatars();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to find avatar URL based on exact or partial name match
  const findAvatarUrl = (name: string, directUrl?: string): string | undefined => {
    if (directUrl) return directUrl;
    if (!name || avatarMap.size === 0) return undefined;

    const clean = name.trim().toLowerCase();
    // 1. Direct full match
    if (avatarMap.has(clean)) return avatarMap.get(clean);

    // 2. Multi-person strings (e.g. "Suryadi & Susilo", "Retno W, Pratiwi") -> match first person
    const firstPerson = clean.split(/&|,|\//)[0].trim();
    if (avatarMap.has(firstPerson)) return avatarMap.get(firstPerson);

    // 3. Substring matching
    for (const [key, url] of avatarMap.entries()) {
      if (clean.includes(key) || key.includes(clean)) {
        return url;
      }
    }
    return undefined;
  };

  useEffect(() => {
    saveOrgData(data);
  }, [data]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(2.5, +(prev + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.4, +(prev - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  const handleResetToDefault = () => {
    if (confirm('Kembalikan struktur organisasi ke data awal dokumen resmi?')) {
      localStorage.removeItem('gesit_corporate_organization_chart_v1');
      localStorage.removeItem('gesit_corporate_organization_chart_v2');
      setData(INITIAL_ORG_DATA);
      saveOrgData(INITIAL_ORG_DATA);
    }
  };

  // Helper recursive updater for children
  const updateNodeRecursive = (
    nodes: OrgNode[],
    updated: { id: string; name: string; title: string; paName?: string; paTitle?: string }
  ): OrgNode[] => {
    return nodes.map(node => {
      if (node.id === updated.id) {
        return {
          ...node,
          name: updated.name,
          title: updated.title,
          ...(node.pa
            ? {
                pa: {
                  ...node.pa,
                  name: updated.paName ?? node.pa.name,
                  title: updated.paTitle ?? node.pa.title,
                },
              }
            : {}),
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeRecursive(node.children, updated),
        };
      }
      return node;
    });
  };

  // Helper recursive deleter
  const deleteNodeRecursive = (nodes: OrgNode[], targetId: string): OrgNode[] => {
    return nodes
      .filter(node => node.id !== targetId)
      .map(node => ({
        ...node,
        children: node.children ? deleteNodeRecursive(node.children, targetId) : undefined,
      }));
  };

  // Helper recursive adder
  const addNodeRecursive = (nodes: OrgNode[], parentId: string, newNode: OrgNode): OrgNode[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode],
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: addNodeRecursive(node.children, parentId, newNode),
        };
      }
      return node;
    });
  };

  const handleSaveNodeEdit = () => {
    if (!editingNode) return;

    if (editingNode.isNew && editingNode.parentId) {
      const newNode: OrgNode = {
        id: `node-${Date.now()}`,
        name: editingNode.name,
        title: editingNode.title,
        type: 'staff',
      };

      if (editingNode.section === 'left') {
        setData(prev => ({
          ...prev,
          leftDivisions: addNodeRecursive(prev.leftDivisions, editingNode.parentId!, newNode),
        }));
      } else if (editingNode.section === 'right') {
        setData(prev => ({
          ...prev,
          rightDivisions: addNodeRecursive(prev.rightDivisions, editingNode.parentId!, newNode),
        }));
      }
    } else {
      setData(prev => ({
        ...prev,
        topExecutives: updateNodeRecursive(prev.topExecutives, editingNode),
        leftDivisions: updateNodeRecursive(prev.leftDivisions, editingNode),
        rightDivisions: updateNodeRecursive(prev.rightDivisions, editingNode),
      }));
    }

    setEditingNode(null);
  };

  const handleDeleteNode = (id: string, section?: 'left' | 'right') => {
    if (!confirm('Hapus posisi / karyawan ini beserta bawahannya?')) return;

    if (section === 'left') {
      setData(prev => ({
        ...prev,
        leftDivisions: deleteNodeRecursive(prev.leftDivisions, id),
      }));
    } else if (section === 'right') {
      setData(prev => ({
        ...prev,
        rightDivisions: deleteNodeRecursive(prev.rightDivisions, id),
      }));
    }
  };

  // Staff card dengan gold left border identik bagan PDF
  const renderStaffCard = (node: OrgNode, section: 'left' | 'right') => {
    const avatarUrl = findAvatarUrl(node.name, node.avatarUrl);

    return (
      <div key={node.id} className="relative group flex flex-col items-center">
        <div className="relative bg-white dark:bg-[#13161c] rounded-md shadow-sm border border-slate-200/90 dark:border-zinc-800 p-2 sm:p-2.5 min-w-[170px] max-w-[210px] w-full border-l-[3.5px] border-l-[#e5a823] transition-all hover:shadow-md">
          {/* Edit overlay */}
          {isEditMode && (
            <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1 z-20">
              <button
                type="button"
                onClick={() =>
                  setEditingNode({
                    id: node.id,
                    name: node.name,
                    title: node.title,
                    section,
                  })
                }
                className="size-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-xs"
                title="Edit Karyawan / Posisi"
              >
                <Edit2 className="size-2.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingNode({
                    id: '',
                    name: '',
                    title: '',
                    parentId: node.id,
                    isNew: true,
                    section,
                  })
                }
                className="size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 shadow-xs"
                title="Tambah Bawahan"
              >
                <Plus className="size-2.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNode(node.id, section)}
                className="size-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-xs"
                title="Hapus"
              >
                <Trash2 className="size-2.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h5 className="text-[10.5px] font-bold text-slate-900 dark:text-zinc-100 truncate leading-snug">
                {node.name}
              </h5>
              <p className="text-[9px] text-slate-500 dark:text-zinc-400 italic truncate leading-normal">
                {node.title}
              </p>
            </div>
            {/* Real profile avatar or icon */}
            <UserAvatar
              name={node.name}
              url={avatarUrl}
              size="xs"
              shape="circle"
              className="size-6 text-[9px] border border-amber-500/40 shrink-0"
            />
          </div>
        </div>

        {/* Sub-Tree Bawahan */}
        {node.children && node.children.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-[1.5px] h-3 bg-slate-400 dark:bg-zinc-600" />
            <div className="relative flex items-start justify-center gap-2 pt-0 w-full flex-wrap">
              {node.children.map(child => renderStaffCard(child, section))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Division Header Bar (Navy blue background with gold accents)
  const renderDivisionBar = (div: OrgNode, section: 'left' | 'right') => {
    const divAvatar = findAvatarUrl(div.name, div.avatarUrl);
    const paAvatar = div.pa ? findAvatarUrl(div.pa.name, div.pa.avatarUrl) : undefined;

    return (
      <div key={div.id} className="w-full space-y-2.5">
        {div.cardImage ? (
          <div className="relative group w-full rounded-xl overflow-hidden shadow-md transition-transform hover:scale-[1.01]">
            {isEditMode && (
              <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                <button
                  type="button"
                  onClick={() =>
                    setEditingNode({
                      id: div.id,
                      name: div.name,
                      title: div.title,
                      paName: div.pa?.name,
                      paTitle: div.pa?.title,
                      section,
                    })
                  }
                  className="size-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-xs"
                  title="Edit Kepala Divisi"
                >
                  <Edit2 className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingNode({
                      id: '',
                      name: '',
                      title: '',
                      parentId: div.id,
                      isNew: true,
                      section,
                    })
                  }
                  className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 shadow-xs"
                  title="Tambah Bawahan Langsung"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            )}
            <img
              src={div.cardImage}
              alt={div.name}
              className="w-full h-auto block object-contain select-none pointer-events-none"
            />
          </div>
        ) : (
          <div className="relative group rounded-xl bg-[#10223e] dark:bg-[#0c182c] text-white p-2.5 sm:p-3 shadow-md flex items-center justify-between border-l-4 border-l-[#e5a823] transition-all">
            {/* Edit overlay */}
            {isEditMode && (
              <div className="absolute -top-2 -right-2 flex items-center gap-1 z-20">
                <button
                  type="button"
                  onClick={() =>
                    setEditingNode({
                      id: div.id,
                      name: div.name,
                      title: div.title,
                      paName: div.pa?.name,
                      paTitle: div.pa?.title,
                      section,
                    })
                  }
                  className="size-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-xs"
                  title="Edit Kepala Divisi"
                >
                  <Edit2 className="size-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingNode({
                      id: '',
                      name: '',
                      title: '',
                      parentId: div.id,
                      isNew: true,
                      section,
                    })
                  }
                  className="size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 shadow-xs"
                  title="Tambah Bawahan Langsung"
                >
                  <Plus className="size-2.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                name={div.name}
                url={divAvatar}
                size="sm"
                shape="circle"
                className="size-8 sm:size-9 border-2 border-[#e5a823] shrink-0 text-xs shadow-xs"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{div.name}</h4>
                <div className="h-[1px] w-full bg-[#e5a823]/60 my-0.5" />
                <p className="text-[10px] font-semibold text-[#f5b82e] truncate">{div.title}</p>
              </div>
            </div>

            {div.pa && (
              <div className="flex items-center gap-2 pl-2 border-l border-white/20 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-white block truncate">{div.pa.name}</span>
                  <span className="text-[8.5px] text-[#f5b82e] italic">({div.pa.title})</span>
                </div>
                <UserAvatar
                  name={div.pa.name}
                  url={paAvatar}
                  size="xs"
                  shape="circle"
                  className="size-6 text-[9px] border border-amber-400 shrink-0"
                />
              </div>
            )}
          </div>
        )}

        {div.children && div.children.length > 0 && (
          <div className="pl-4 border-l-2 border-slate-300 dark:border-zinc-700 ml-5 space-y-2.5 pt-1">
            {div.children.map(child => renderStaffCard(child, section))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1900px] space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            <span>Master Data & Bagan Korporasi</span>
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 sm:text-3xl flex items-center gap-2">
            <Users className="h-7 w-7 text-[#10223e] dark:text-blue-400" />
            Struktur Organisasi The Gesit Companies
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 sm:text-sm">
            Bagan struktur resmi dapat diedit, diperbesar, dan disesuaikan langsung.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-800 p-1 border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'canvas'
                  ? 'bg-white dark:bg-zinc-900 text-[#10223e] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bagan Interaktif (Bisa Diedit)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pdf'
                  ? 'bg-white dark:bg-zinc-900 text-[#10223e] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dokumen Asli PDF
            </button>
          </div>

          {/* Edit Mode Toggle Button */}
          {activeTab === 'canvas' && (
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                isEditMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/30'
                  : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
              }`}
            >
              {isEditMode ? <Check className="size-3.5" /> : <Edit2 className="size-3.5" />}
              <span>{isEditMode ? 'Selesai Edit' : 'Edit Bagan'}</span>
            </button>
          )}

          {/* Zoom Controls */}
          {activeTab === 'canvas' && (
            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-1 shadow-2xs text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="px-2 font-mono font-bold text-slate-700 dark:text-zinc-300 text-[11px] min-w-[50px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors border-l border-slate-200 dark:border-zinc-800 ml-1"
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          )}

          {/* Reset to Default */}
          {isEditMode && (
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-300 transition-colors"
              title="Reset ke bagan default awal"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset Data</span>
            </button>
          )}

          {/* Download Original PDF */}
          <a
            href="/so_without_gf.pdf"
            download="Struktur_Organisasi_The_Gesit_Companies.pdf"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#10223e] text-white text-xs font-semibold hover:bg-[#0c182c] transition-colors shadow-2xs"
          >
            <Download className="size-3.5" />
            <span>Unduh PDF</span>
          </a>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-[#f8fafc] dark:bg-[#0a0a0c] p-6 lg:p-10 shadow-inner overflow-x-auto min-h-[750px]">
        {activeTab === 'pdf' ? (
          <div className="w-full h-[80vh] rounded-xl overflow-hidden border border-slate-300 dark:border-zinc-800 bg-white">
            <iframe
              src="/so_without_gf.pdf#toolbar=1&navpanes=0&view=FitH"
              title="Struktur Organisasi PDF"
              className="w-full h-full border-none"
            />
          </div>
        ) : (
          <div
            className="min-w-[1100px] max-w-[1350px] mx-auto flex flex-col items-center transition-transform origin-top space-y-6"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Corporate Header Title */}
            <div className="text-center space-y-1 mb-2">
              <h2 className="text-2xl font-black tracking-widest text-[#10223e] dark:text-blue-400 uppercase">
                {data.title}
              </h2>
              <div className="h-0.5 w-40 bg-[#e5a823] mx-auto rounded-full" />
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                Corporate Organizational Structure
              </p>
            </div>

            {/* ================= TOP LEVEL C-SUITE TOWER ================= */}
            <div className="flex flex-col items-center w-full max-w-[950px]">
              {data.topExecutives.map((exec, idx) => {
                const execAvatar = findAvatarUrl(exec.name, exec.avatarUrl);
                const paAvatar = exec.pa ? findAvatarUrl(exec.pa.name, exec.pa.avatarUrl) : undefined;

                return (
                  <React.Fragment key={exec.id}>
                    <div className="relative flex items-center justify-center w-full">
                      {/* Executive Card with exact PDF graphic if available */}
                      <div className="relative group w-[320px] sm:w-[350px] transition-transform hover:scale-[1.01]">
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNode({
                                id: exec.id,
                                name: exec.name,
                                title: exec.title,
                                paName: exec.pa?.name,
                                paTitle: exec.pa?.title,
                                section: 'top',
                              })
                            }
                            className="absolute top-2 right-2 size-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-md z-20"
                            title="Edit Eksekutif"
                          >
                            <Edit2 className="size-3" />
                          </button>
                        )}

                        <div className="w-full bg-transparent select-none pointer-events-none filter drop-shadow-md">
                          <img
                            src={exec.cardImage || `/image/org_people/${exec.id}.png`}
                            alt={exec.name}
                            className="w-full h-auto block object-contain"
                          />
                        </div>
                      </div>

                      {/* Horizontal connector to PA */}
                      {exec.pa && (
                        <div className="absolute left-[calc(50%+160px)] sm:left-[calc(50%+175px)] flex items-center">
                          {/* Pure horizontal black line */}
                          <div className="w-10 sm:w-14 h-[2px] bg-black" />

                          {/* PA Card with exact PDF graphic */}
                          <div className="relative group w-[210px] sm:w-[230px] transition-transform hover:scale-[1.01]">
                            {isEditMode && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingNode({
                                    id: exec.id,
                                    name: exec.name,
                                    title: exec.title,
                                    paName: exec.pa?.name,
                                    paTitle: exec.pa?.title,
                                    section: 'top',
                                  })
                                }
                                className="absolute top-2 right-2 size-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-xs z-20"
                                title="Edit PA"
                              >
                                <Edit2 className="size-2.5" />
                              </button>
                            )}

                            <div className="w-full bg-transparent select-none pointer-events-none filter drop-shadow-md">
                              <img
                                src={exec.pa.cardImage || `/image/org_people/${exec.pa.id}.png`}
                                alt={exec.pa.name}
                                className="w-full h-auto block object-contain"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Central Vertical Connector Spine (Solid black line) */}
                    {idx < data.topExecutives.length - 1 && (
                      <div className="w-[2px] h-7 bg-black" />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Central Spine Branching to 2 Main Columns */}
              <div className="w-[2px] h-10 bg-black" />
            </div>

            {/* ================= TWO COLUMNS (LEFT & RIGHT WINGS) ================= */}
            <div className="relative w-full pt-0">
              <div className="absolute top-0 left-[26%] right-[26%] h-[1.5px] bg-slate-400 dark:bg-zinc-600" />

              <div className="grid grid-cols-2 gap-8 lg:gap-12 w-full pt-4">
                {/* LEFT COLUMN */}
                <div className="space-y-7 flex flex-col items-center">
                  {data.leftDivisions.map(div => renderDivisionBar(div, 'left'))}
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-7 flex flex-col items-center">
                  {data.rightDivisions.map(div => renderDivisionBar(div, 'right'))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Node Modal Dialog */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Edit2 className="size-4 text-[#10223e]" />
                <span>{editingNode.isNew ? 'Tambah Posisi / Karyawan' : 'Edit Karyawan / Posisi'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Nama Personel / Unit
                </label>
                <input
                  type="text"
                  value={editingNode.name}
                  onChange={e => setEditingNode({ ...editingNode, name: e.target.value })}
                  placeholder="Contoh: Rudi Si'arudin"
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 px-3 text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#10223e]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Jabatan / Posisi
                </label>
                <input
                  type="text"
                  value={editingNode.title}
                  onChange={e => setEditingNode({ ...editingNode, title: e.target.value })}
                  placeholder="Contoh: IT Supervisor"
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 px-3 text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#10223e]"
                />
              </div>

              {/* Optional PA inputs */}
              {editingNode.paName !== undefined && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                    Asisten Pribadi (PA & Secretary)
                  </label>
                  <input
                    type="text"
                    value={editingNode.paName}
                    onChange={e => setEditingNode({ ...editingNode, paName: e.target.value })}
                    placeholder="Nama Sekretaris"
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 px-3 text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#10223e]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNodeEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#10223e] hover:bg-[#0c182c] shadow-xs transition-colors"
              >
                <Save className="size-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationStructurePage;
