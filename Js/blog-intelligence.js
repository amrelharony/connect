// blog-intelligence.js — Intelligence dashboard: VDna, Emotion, Biometric, Interactions, Impressions, External APIs
(function() {
    'use strict';
    var B = window._Blog;
    if (!B) return;
    var esc = B.esc;

    var DONUT_COLORS = ['#00e1ff','#6366f1','#f59e0b','#22c55e','#ef4444','#ec4899','#8b5cf6','#14b8a6','#64748b','#f97316','#06b6d4'];
    var MOOD_COLORS = { neutral:'#64748b', warm:'#f59e0b', playful:'#ec4899', focused:'#6366f1', determined:'#ef4444', calm:'#22c55e', serene:'#14b8a6', intense:'#f97316', melancholy:'#8b5cf6', surprised:'#f43f5e', curious:'#06b6d4' };

    function _donut(segments, size) {
        var r = size / 2 - 4, cx = size / 2, cy = size / 2;
        var total = segments.reduce(function(s, seg) { return s + seg.value; }, 0) || 1;
        var cumAngle = -90, paths = '';
        segments.forEach(function(seg, i) {
            var angle = (seg.value / total) * 360;
            var startRad = (cumAngle * Math.PI) / 180;
            var endRad = ((cumAngle + angle) * Math.PI) / 180;
            var x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
            var x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
            if (angle > 0.5) {
                paths += '<path d="M' + cx + ',' + cy + ' L' + x1.toFixed(2) + ',' + y1.toFixed(2) +
                    ' A' + r + ',' + r + ' 0 ' + (angle > 180 ? 1 : 0) + ',1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) +
                    ' Z" fill="' + (seg.color || DONUT_COLORS[i % DONUT_COLORS.length]) + '" opacity=".85"/>';
            }
            cumAngle += angle;
        });
        paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.55) + '" fill="var(--bg)"/>';
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + paths + '</svg>';
    }

    function _barChart(items, maxVal) {
        if (!maxVal) maxVal = Math.max.apply(null, items.map(function(i) { return i.value; })) || 1;
        return items.map(function(item, idx) {
            var pct = Math.round((item.value / maxVal) * 100);
            return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
                '<span class="lb-bar-label" style="width:100px;font-size:10px">' + esc(item.label) + '</span>' +
                '<div style="flex:1;height:14px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden">' +
                '<div style="width:' + pct + '%;height:100%;background:' + (DONUT_COLORS[idx % DONUT_COLORS.length]) + ';border-radius:3px;transition:width .3s"></div></div>' +
                '<span style="font-size:10px;color:var(--sub);min-width:35px;text-align:right">' + item.value + '</span></div>';
        }).join('');
    }

    function _section(title, icon, content) {
        return '<div class="lb-intel-section">' +
            '<h3 class="lb-intel-title"><span>' + icon + '</span> ' + esc(title) + '</h3>' +
            '<div class="lb-intel-body">' + content + '</div></div>';
    }

    async function renderIntelligenceDashboard() {
        var container = document.getElementById('lbIntelContent');
        if (!container || !window._sb) return;
        container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">🧠</div>Loading intelligence data...</div>';

        try {
            var sb = window._sb;
            var [eventsRes, visitorRes, articlesRes, readingRes] = await Promise.all([
                sb.from('article_events').select('*').order('created_at', { ascending: false }).limit(5000),
                sb.from('visitor_profiles').select('*').limit(1000),
                sb.from('longform_articles').select('id,title,slug,views,tags,created_at,linkedin_posted').eq('published', true),
                sb.rpc('get_aggregate_reading_stats').then(function(r) { return r.error ? sb.from('reading_history').select('*') : r; })
            ]);

            var events = eventsRes.data || [];
            var visitors = visitorRes.data || [];
            var articles = articlesRes.data || [];
            var reading = readingRes.data || [];

            var html = '<div class="lb-intel-grid">';

            // ── 1. VDna Integration ──
            html += _renderVDna(visitors);

            // ── 2. Emotion Analytics ──
            html += _renderEmotionAnalytics(events, reading);

            // ── 3. Biometric Confidence ──
            html += _renderBiometric(visitors);

            // ── 4. Interaction Analytics ──
            html += _renderInteractions(events, articles);

            // ── 5. Impression Analytics ──
            html += _renderImpressions(events);

            // ── 6. External: PageSpeed ──
            html += _renderPageSpeed();

            // ── 7. External: LinkedIn Reach ──
            html += _renderLinkedInReach(articles);

            html += '</div>';
            container.innerHTML = html;

            _fetchPageSpeedAsync();
            _fetchLinkedInAsync(articles);

        } catch (e) {
            container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">⚠️</div>Failed to load intelligence data.</div>';
        }
    }

    // ═══════════════════════════════════════════════════
    // VDna VISITOR INTELLIGENCE
    // ═══════════════════════════════════════════════════
    function _renderVDna(visitors) {
        if (!visitors.length) return _section('Visitor Intelligence (VDna)', '🧬', '<div style="color:var(--sub);font-size:11px">No visitor data yet.</div>');

        var totalVisitors = visitors.length;
        var avgXp = Math.round(visitors.reduce(function(s, v) { return s + (v.xp || 0); }, 0) / totalVisitors);
        var avgLevel = (visitors.reduce(function(s, v) { return s + (v.level || 1); }, 0) / totalVisitors).toFixed(1);
        var returning = visitors.filter(function(v) { return (v.visits || 0) > 1; }).length;
        var newVis = totalVisitors - returning;

        var deviceMap = {};
        visitors.forEach(function(v) {
            var d = v.device || 'Unknown';
            deviceMap[d] = (deviceMap[d] || 0) + 1;
        });
        var deviceSegments = Object.keys(deviceMap).map(function(k) { return { label: k, value: deviceMap[k] }; })
            .sort(function(a, b) { return b.value - a.value; }).slice(0, 5);

        var kpis =
            '<div class="lb-kpi-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + totalVisitors + '</div><div class="lb-kpi-label">Unique Visitors</div></div>' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + avgXp + '</div><div class="lb-kpi-label">Avg XP</div></div>' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + avgLevel + '</div><div class="lb-kpi-label">Avg Level</div></div>' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + Math.round(returning / totalVisitors * 100) + '%</div><div class="lb-kpi-label">Returning</div></div>' +
            '</div>';

        var charts =
            '<div style="display:flex;gap:16px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:140px">' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">New vs Returning</div>' +
            _donut([{ label: 'New', value: newVis, color: '#00e1ff' }, { label: 'Returning', value: returning, color: '#6366f1' }], 100) +
            '<div style="display:flex;gap:12px;margin-top:6px;font-size:9px;color:var(--sub)">' +
            '<span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:#00e1ff"></span>New ' + newVis + '</span>' +
            '<span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:#6366f1"></span>Returning ' + returning + '</span>' +
            '</div></div>' +
            '<div style="flex:1;min-width:200px">' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Top Devices</div>' +
            _barChart(deviceSegments) +
            '</div></div>';

        return _section('Visitor Intelligence (VDna)', '🧬', kpis + charts);
    }

    // ═══════════════════════════════════════════════════
    // EMOTION ANALYTICS
    // ═══════════════════════════════════════════════════
    function _renderEmotionAnalytics(events, reading) {
        var moodEvents = events.filter(function(e) { return e.mood; });
        if (!moodEvents.length) return _section('Emotion Analytics', '🎭', '<div style="color:var(--sub);font-size:11px">No mood data collected yet. Mood is captured with each telemetry event when the Emotion Engine is active.</div>');

        var moodCounts = {};
        moodEvents.forEach(function(e) {
            moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        });

        var moodSegments = Object.keys(moodCounts).map(function(m) {
            return { label: m, value: moodCounts[m], color: MOOD_COLORS[m] || '#64748b' };
        }).sort(function(a, b) { return b.value - a.value; });

        var donutHtml =
            '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">' +
            '<div>' + _donut(moodSegments, 120) + '</div>' +
            '<div style="flex:1;min-width:150px">' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Mood Distribution</div>' +
            moodSegments.slice(0, 8).map(function(s) {
                var pct = Math.round(s.value / moodEvents.length * 100);
                return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:10px">' +
                    '<span style="width:8px;height:8px;border-radius:2px;background:' + s.color + '"></span>' +
                    '<span style="flex:1;color:var(--text)">' + s.label + '</span>' +
                    '<span style="color:var(--sub)">' + pct + '% (' + s.value + ')</span></div>';
            }).join('') +
            '</div></div>';

        var correlationHtml = '';
        if (reading.length) {
            var moodReading = {};
            reading.forEach(function(r) {
                var evts = moodEvents.filter(function(e) { return e.article_id === r.article_id; });
                evts.forEach(function(e) {
                    if (!moodReading[e.mood]) moodReading[e.mood] = { time: [], progress: [] };
                    moodReading[e.mood].time.push(r.time_spent || 0);
                    moodReading[e.mood].progress.push(r.progress || 0);
                });
            });
            var corrItems = Object.keys(moodReading).map(function(m) {
                var d = moodReading[m];
                var avgTime = Math.round(d.time.reduce(function(s, v) { return s + v; }, 0) / d.time.length);
                var avgProg = Math.round(d.progress.reduce(function(s, v) { return s + v; }, 0) / d.progress.length);
                return { label: m, time: avgTime, progress: avgProg };
            }).sort(function(a, b) { return b.progress - a.progress; });

            if (corrItems.length) {
                correlationHtml = '<div style="margin-top:14px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Mood vs Engagement</div>' +
                    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px">' +
                    corrItems.map(function(c) {
                        return '<div class="lb-kpi-card" style="padding:10px"><div style="font-size:10px;font-weight:700;color:' + (MOOD_COLORS[c.label] || 'var(--text)') + '">' + c.label + '</div>' +
                            '<div style="font-size:9px;color:var(--sub);margin-top:4px">Avg ' + Math.round(c.time / 60) + 'm · ' + c.progress + '% read</div></div>';
                    }).join('') + '</div></div>';
            }
        }

        return _section('Emotion Analytics', '🎭', donutHtml + correlationHtml);
    }

    // ═══════════════════════════════════════════════════
    // BIOMETRIC CONFIDENCE
    // ═══════════════════════════════════════════════════
    function _renderBiometric(visitors) {
        var riskProfile = window._riskProfile;
        var content = '';

        if (riskProfile) {
            var score = riskProfile.humanScore != null ? Math.round(riskProfile.humanScore * 100) : null;
            content += '<div class="lb-kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">' +
                '<div class="lb-kpi-card"><div class="lb-kpi-value" style="color:' + (score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444') + '">' + (score != null ? score + '%' : '—') + '</div><div class="lb-kpi-label">Human Confidence</div></div>' +
                '<div class="lb-kpi-card"><div class="lb-kpi-value">' + (riskProfile.anomalyScore != null ? riskProfile.anomalyScore.toFixed(2) : '—') + '</div><div class="lb-kpi-label">Anomaly Score</div></div>' +
                '<div class="lb-kpi-card"><div class="lb-kpi-value">' + (riskProfile.samplesCollected || 0) + '</div><div class="lb-kpi-label">Samples</div></div>' +
                '</div>';
        }

        var visWithXp = visitors.filter(function(v) { return (v.xp || 0) > 0; });
        var highEngagement = visWithXp.filter(function(v) { return (v.xp || 0) > 100; }).length;
        var medEngagement = visWithXp.filter(function(v) { return (v.xp || 0) > 20 && (v.xp || 0) <= 100; }).length;
        var lowEngagement = visWithXp.length - highEngagement - medEngagement;

        if (visWithXp.length) {
            content += '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Engagement Distribution</div>' +
                _barChart([
                    { label: 'High (>100 XP)', value: highEngagement },
                    { label: 'Medium (20-100)', value: medEngagement },
                    { label: 'Low (<20 XP)', value: lowEngagement }
                ]);
        }

        if (!content) content = '<div style="color:var(--sub);font-size:11px">Biometric data is collected in real-time and requires the Risk Engine to be active.</div>';

        return _section('Biometric Confidence', '🛡️', content);
    }

    // ═══════════════════════════════════════════════════
    // INTERACTION ANALYTICS
    // ═══════════════════════════════════════════════════
    function _renderInteractions(events, articles) {
        var interactionTypes = ['share_x','share_linkedin','share_whatsapp','share_telegram','share_email','copy_link','bookmark','tts_start','reaction','comment_submit','comment_reply'];
        var counts = {};
        events.forEach(function(e) {
            if (interactionTypes.indexOf(e.event_type) !== -1) {
                counts[e.event_type] = (counts[e.event_type] || 0) + 1;
            }
        });

        var totalInteractions = Object.values(counts).reduce(function(s, v) { return s + v; }, 0);
        if (!totalInteractions) return _section('Interaction Analytics', '🎯', '<div style="color:var(--sub);font-size:11px">No interaction events collected yet. Events are tracked as users share, bookmark, react, and comment.</div>');

        var shareCounts = {};
        ['share_x','share_linkedin','share_whatsapp','share_telegram','share_email'].forEach(function(t) {
            if (counts[t]) shareCounts[t.replace('share_', '')] = counts[t];
        });

        var totalShares = Object.values(shareCounts).reduce(function(s, v) { return s + v; }, 0);
        var totalViews = articles.reduce(function(s, a) { return s + (a.views || 0); }, 0) || 1;

        var kpis =
            '<div class="lb-kpi-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + totalInteractions + '</div><div class="lb-kpi-label">Total Interactions</div></div>' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + (totalShares / totalViews * 100).toFixed(1) + '%</div><div class="lb-kpi-label">Share Rate</div></div>' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + (counts.bookmark || 0) + '</div><div class="lb-kpi-label">Bookmarks</div></div>' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + (counts.tts_start || 0) + '</div><div class="lb-kpi-label">TTS Listens</div></div>' +
            '</div>';

        var shareSegments = Object.keys(shareCounts).map(function(k) { return { label: k, value: shareCounts[k] }; })
            .sort(function(a, b) { return b.value - a.value; });

        var interactionItems = interactionTypes.filter(function(t) { return counts[t]; })
            .map(function(t) { return { label: t.replace(/_/g, ' '), value: counts[t] }; })
            .sort(function(a, b) { return b.value - a.value; });

        var charts =
            '<div style="display:flex;gap:16px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:200px">' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">By Type</div>' +
            _barChart(interactionItems) +
            '</div>';

        if (shareSegments.length) {
            charts += '<div style="min-width:140px">' +
                '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Share Channels</div>' +
                _donut(shareSegments, 100) +
                '<div style="margin-top:6px">' + shareSegments.map(function(s, i) {
                    return '<div style="display:flex;align-items:center;gap:4px;font-size:9px;color:var(--sub);margin-bottom:2px">' +
                        '<span style="width:6px;height:6px;border-radius:1px;background:' + DONUT_COLORS[i % DONUT_COLORS.length] + '"></span>' + s.label + ' ' + s.value + '</div>';
                }).join('') + '</div></div>';
        }
        charts += '</div>';

        // Interaction funnel
        var impressions = events.filter(function(e) { return e.event_type === 'impression'; }).length;
        var scroll50 = events.filter(function(e) { return e.event_type === 'scroll_50'; }).length;
        var reactions = counts.reaction || 0;
        var funnelItems = [
            { label: 'Impressions', value: impressions },
            { label: 'Scroll 50%', value: scroll50 },
            { label: 'Reactions', value: reactions },
            { label: 'Shares', value: totalShares }
        ];
        var funnelMax = funnelItems[0].value || 1;
        var funnelHtml = '<div style="margin-top:14px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Interaction Funnel</div>' +
            funnelItems.map(function(f, i) {
                var pct = Math.round(f.value / funnelMax * 100);
                return '<div style="margin-bottom:6px">' +
                    '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text);margin-bottom:2px"><span>' + f.label + '</span><span>' + f.value + ' (' + pct + '%)</span></div>' +
                    '<div style="height:16px;background:rgba(255,255,255,.04);border-radius:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + DONUT_COLORS[i] + ';border-radius:3px"></div></div></div>';
            }).join('') + '</div>';

        return _section('Interaction Analytics', '🎯', kpis + charts + funnelHtml);
    }

    // ═══════════════════════════════════════════════════
    // IMPRESSION ANALYTICS
    // ═══════════════════════════════════════════════════
    function _renderImpressions(events) {
        var impressions = events.filter(function(e) { return e.event_type === 'impression'; });
        if (!impressions.length) return _section('Impression Analytics', '👁️', '<div style="color:var(--sub);font-size:11px">No impression data yet. Section-level impressions are tracked as readers scroll through articles.</div>');

        var sectionCounts = {};
        var sectionDwell = {};
        impressions.forEach(function(e) {
            var sec = (e.event_data && e.event_data.section) || 'unknown';
            var tag = sec.replace(/-.*/, '');
            sectionCounts[tag] = (sectionCounts[tag] || 0) + 1;
            var dwell = (e.event_data && e.event_data.dwell_ms) || 0;
            if (!sectionDwell[tag]) sectionDwell[tag] = [];
            sectionDwell[tag].push(dwell);
        });

        var sectionItems = Object.keys(sectionCounts).map(function(k) {
            return { label: k, value: sectionCounts[k] };
        }).sort(function(a, b) { return b.value - a.value; }).slice(0, 10);

        var dwellItems = Object.keys(sectionDwell).map(function(k) {
            var arr = sectionDwell[k];
            var avg = Math.round(arr.reduce(function(s, v) { return s + v; }, 0) / arr.length / 1000);
            return { label: k, value: avg };
        }).sort(function(a, b) { return b.value - a.value; }).slice(0, 10);

        var content =
            '<div style="display:flex;gap:16px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:200px">' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Section Views</div>' +
            _barChart(sectionItems) +
            '</div>' +
            '<div style="flex:1;min-width:200px">' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Avg Dwell Time (sec)</div>' +
            _barChart(dwellItems) +
            '</div></div>';

        // Scroll depth distribution
        var scrollEvents = {};
        ['scroll_25','scroll_50','scroll_75','scroll_100'].forEach(function(t) {
            scrollEvents[t] = events.filter(function(e) { return e.event_type === t; }).length;
        });
        var scrollMax = scrollEvents.scroll_25 || 1;
        content += '<div style="margin-top:14px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">Scroll Depth Drop-off</div>' +
            [{ label: '25%', value: scrollEvents.scroll_25 }, { label: '50%', value: scrollEvents.scroll_50 },
             { label: '75%', value: scrollEvents.scroll_75 }, { label: '100%', value: scrollEvents.scroll_100 }].map(function(s, i) {
                var pct = Math.round(s.value / scrollMax * 100);
                return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
                    '<span style="width:40px;font-size:10px;color:var(--sub)">' + s.label + '</span>' +
                    '<div style="flex:1;height:14px;background:rgba(255,255,255,.04);border-radius:3px;overflow:hidden">' +
                    '<div style="width:' + pct + '%;height:100%;background:' + DONUT_COLORS[i] + ';border-radius:3px"></div></div>' +
                    '<span style="font-size:10px;color:var(--sub);min-width:50px;text-align:right">' + s.value + ' (' + pct + '%)</span></div>';
            }).join('') + '</div>';

        return _section('Impression Analytics', '👁️', content);
    }

    // ═══════════════════════════════════════════════════
    // PAGESPEED / SEO (External API)
    // ═══════════════════════════════════════════════════
    function _renderPageSpeed() {
        var cached = null;
        try {
            var raw = localStorage.getItem('_intel_pagespeed');
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.ts && Date.now() - parsed.ts < 86400000) cached = parsed.data;
            }
        } catch (e) {}

        if (cached) {
            return _section('PageSpeed / SEO', '⚡', _pageSpeedContent(cached));
        }
        return _section('PageSpeed / SEO', '⚡', '<div id="lbPageSpeedResult" style="color:var(--sub);font-size:11px">Fetching PageSpeed scores...</div>');
    }

    function _pageSpeedContent(data) {
        var cats = data.categories || {};
        var items = ['performance','accessibility','best-practices','seo'].map(function(key) {
            var cat = cats[key] || cats[key.replace('-', '_')] || {};
            var score = cat.score != null ? Math.round(cat.score * 100) : null;
            var color = score > 89 ? '#22c55e' : score > 49 ? '#f59e0b' : '#ef4444';
            return '<div class="lb-kpi-card"><div class="lb-kpi-value" style="color:' + color + '">' + (score != null ? score : '—') + '</div><div class="lb-kpi-label">' + key.replace(/-/g, ' ') + '</div></div>';
        }).join('');

        return '<div class="lb-kpi-grid" style="grid-template-columns:repeat(4,1fr);gap:8px">' + items + '</div>';
    }

    function _fetchPageSpeedAsync() {
        var el = document.getElementById('lbPageSpeedResult');
        if (!el) return;
        var url = encodeURIComponent(window.location.origin + window.location.pathname);
        fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + url + '&category=performance&category=seo&category=accessibility&category=best-practices&strategy=mobile')
            .then(function(r) { return r.json(); })
            .then(function(json) {
                if (json.lighthouseResult) {
                    var data = { categories: json.lighthouseResult.categories };
                    localStorage.setItem('_intel_pagespeed', JSON.stringify({ ts: Date.now(), data: data }));
                    el.outerHTML = _pageSpeedContent(data);
                } else {
                    el.textContent = 'PageSpeed API returned no data.';
                }
            })
            .catch(function() { el.textContent = 'Failed to fetch PageSpeed scores.'; });
    }

    // ═══════════════════════════════════════════════════
    // LINKEDIN SOCIAL REACH (External API)
    // ═══════════════════════════════════════════════════
    function _renderLinkedInReach(articles) {
        var posted = articles.filter(function(a) { return a.linkedin_posted; });
        if (!posted.length) return _section('LinkedIn Reach', '🔗', '<div style="color:var(--sub);font-size:11px">No articles have been posted to LinkedIn yet.</div>');

        return _section('LinkedIn Reach', '🔗',
            '<div id="lbLinkedInResult">' +
            '<div class="lb-kpi-grid" style="grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + posted.length + '</div><div class="lb-kpi-label">Articles on LinkedIn</div></div>' +
            '<div class="lb-kpi-card"><div class="lb-kpi-value">' + Math.round(posted.length / articles.length * 100) + '%</div><div class="lb-kpi-label">Share Coverage</div></div>' +
            '</div>' +
            '<div style="font-size:10px;color:var(--sub)">Articles posted to LinkedIn:</div>' +
            '<div style="margin-top:6px">' + posted.slice(0, 10).map(function(a) {
                return '<div style="font-size:10px;color:var(--text);padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">' +
                    esc(a.title) + ' <span style="color:var(--sub)">· ' + (a.views || 0) + ' views</span></div>';
            }).join('') + '</div>' +
            '</div>'
        );
    }

    function _fetchLinkedInAsync(articles) {
        // LinkedIn API requires OAuth and is not publicly accessible for post metrics
        // This panel shows articles marked as posted, actual metrics would need server-side proxy
    }

    B.renderIntelligenceDashboard = renderIntelligenceDashboard;
})();
