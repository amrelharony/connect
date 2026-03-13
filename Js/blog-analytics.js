// blog-analytics.js — Analytics dashboard, chart builders, drill-down, export
(function() {
    'use strict';
    var B = window._Blog;
    var esc = B.esc;
    var snd = B.snd;
    var fmtDate = B.fmtDate;

    /* ═══════════════════════════════════════════════════
       ULTRA-ADVANCED ANALYTICS DASHBOARD
       ═══════════════════════════════════════════════════ */
    let _analyticsDays = 30;
    let _analyticsCache = null;
    let _analyticsSortCol = 'views';
    let _analyticsSortAsc = false;
    let _analyticsAbort = null;

    const COUNTRY_FLAGS = {US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',FR:'🇫🇷',CA:'🇨🇦',AU:'🇦🇺',IN:'🇮🇳',BR:'🇧🇷',JP:'🇯🇵',KR:'🇰🇷',CN:'🇨🇳',NL:'🇳🇱',SE:'🇸🇪',ES:'🇪🇸',IT:'🇮🇹',MX:'🇲🇽',PL:'🇵🇱',RU:'🇷🇺',TR:'🇹🇷',SA:'🇸🇦',AE:'🇦🇪',EG:'🇪🇬',NG:'🇳🇬',ZA:'🇿🇦',AR:'🇦🇷',CL:'🇨🇱',CO:'🇨🇴',PH:'🇵🇭',ID:'🇮🇩',TH:'🇹🇭',VN:'🇻🇳',MY:'🇲🇾',SG:'🇸🇬',PK:'🇵🇰',BD:'🇧🇩',UA:'🇺🇦',RO:'🇷🇴',CZ:'🇨🇿',AT:'🇦🇹',CH:'🇨🇭',BE:'🇧🇪',DK:'🇩🇰',NO:'🇳🇴',FI:'🇫🇮',IE:'🇮🇪',PT:'🇵🇹',GR:'🇬🇷',IL:'🇮🇱',NZ:'🇳🇿',HK:'🇭🇰',TW:'🇹🇼'};
    const DONUT_COLORS = ['#00e1ff','#6366f1','#f59e0b','#22c55e','#ef4444','#ec4899','#8b5cf6','#14b8a6'];

    async function _fetchAnalyticsData(days) {
        const sb = window._sb;
        if (!sb) return null;
        if (_analyticsAbort) _analyticsAbort.abort();
        _analyticsAbort = new AbortController();
        const sig = _analyticsAbort.signal;

        const cutoff = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
        const prevCutoff = days ? new Date(Date.now() - days * 2 * 86400000).toISOString() : null;

        const [articlesRes, commentsRes, commentsCountRes, subCountRes, visitsRes, prevVisitsRes, historyRes, subListRes, recentCommentsRes] = await Promise.all([
            sb.from('longform_articles').select('id,title,slug,views,reactions,published,created_at,tags,series_name').order('views', { ascending: false }).abortSignal(sig),
            cutoff
                ? sb.from('article_comments').select('id,article_id,created_at', { count: 'exact', head: false }).gte('created_at', cutoff).abortSignal(sig)
                : sb.from('article_comments').select('id,article_id,created_at', { count: 'exact', head: false }).abortSignal(sig),
            sb.from('article_comments').select('id', { count: 'exact', head: true }).abortSignal(sig),
            sb.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).abortSignal(sig),
            cutoff
                ? sb.from('site_visits').select('created_at,country,device,browser,is_mobile,referrer,page_url,session_id').gte('created_at', cutoff).order('created_at', { ascending: true }).abortSignal(sig)
                : sb.from('site_visits').select('created_at,country,device,browser,is_mobile,referrer,page_url,session_id').order('created_at', { ascending: true }).abortSignal(sig),
            (cutoff && prevCutoff)
                ? sb.from('site_visits').select('created_at,page_url,session_id').gte('created_at', prevCutoff).lt('created_at', cutoff).abortSignal(sig)
                : Promise.resolve({ data: [] }),
            (async () => {
                const rpcRes = await sb.rpc('get_aggregate_reading_stats').abortSignal(sig);
                if (rpcRes.error) return sb.from('reading_history').select('article_id,progress,time_spent,completed').abortSignal(sig);
                return rpcRes;
            })(),
            sb.from('newsletter_subscribers').select('created_at').order('created_at', { ascending: true }).abortSignal(sig),
            sb.from('article_comments').select('id,article_id,author_name,content,created_at').order('created_at', { ascending: false }).limit(10).abortSignal(sig)
        ]);

        if (sig.aborted) return null;

        const articles = articlesRes.data || [];
        const published = articles.filter(a => a.published);
        const comments = commentsRes.data || [];
        const totalComments = commentsCountRes.count || 0;
        const subscriberCount = subCountRes.count || 0;
        const visits = visitsRes.data || [];
        const prevVisits = prevVisitsRes.data || [];
        const readingHistory = historyRes.data || [];
        const subscribers = subListRes.data || [];
        const recentComments = recentCommentsRes.data || [];

        const blogVisits = visits.filter(v => v.page_url && (v.page_url.includes('?post=') || v.page_url.includes('?blog=')));
        const prevBlogVisits = prevVisits.filter(v => v.page_url && (v.page_url.includes('?post=') || v.page_url.includes('?blog=')));

        const totalViews = published.reduce((s, a) => s + (a.views || 0), 0);
        const totalReactions = published.reduce((s, a) => {
            const rx = a.reactions || {};
            return s + Object.values(rx).reduce((s2, v) => s2 + (v || 0), 0);
        }, 0);

        const prevUniqueVisitors = new Set(prevBlogVisits.map(v => v.session_id)).size;
        const curUniqueVisitors = new Set(blogVisits.map(v => v.session_id)).size;

        const avgCompletion = readingHistory.length
            ? readingHistory.reduce((s, r) => s + (r.progress || 0), 0) / readingHistory.length
            : 0;
        const avgTimeSpent = readingHistory.length
            ? readingHistory.reduce((s, r) => s + (r.time_spent || 0), 0) / readingHistory.length
            : 0;
        const completionRate = readingHistory.length
            ? readingHistory.filter(r => r.completed).length / readingHistory.length
            : 0;

        return {
            articles, published, comments, totalComments, subscriberCount,
            visits, prevVisits, blogVisits, prevBlogVisits, readingHistory,
            subscribers, recentComments, totalViews, totalReactions,
            prevUniqueVisitors, curUniqueVisitors, avgCompletion, avgTimeSpent, completionRate
        };
    }

    function _buildSparklineSVG(dataPoints, w, h) {
        if (!dataPoints.length) return '';
        const max = Math.max(...dataPoints, 1);
        const min = Math.min(...dataPoints, 0);
        const range = max - min || 1;
        const step = w / Math.max(dataPoints.length - 1, 1);
        const pts = dataPoints.map((v, i) => {
            const x = (i * step).toFixed(1);
            const y = (h - ((v - min) / range) * (h * 0.85) - h * 0.05).toFixed(1);
            return x + ',' + y;
        });
        const areaPath = 'M0,' + h + ' L' + pts.join(' L') + ' L' + w + ',' + h + ' Z';
        const linePath = 'M' + pts.join(' L');
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            '<path d="' + areaPath + '" fill="var(--accent)" opacity=".12"/>' +
            '<path d="' + linePath + '" fill="none" stroke="var(--accent)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
            '</svg>';
    }

    function _buildDonutSVG(segments, size) {
        const r = size / 2 - 4;
        const cx = size / 2;
        const cy = size / 2;
        const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
        let cumAngle = -90;
        let paths = '';
        segments.forEach((seg, i) => {
            const angle = (seg.value / total) * 360;
            const startRad = (cumAngle * Math.PI) / 180;
            const endRad = ((cumAngle + angle) * Math.PI) / 180;
            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);
            const large = angle > 180 ? 1 : 0;
            if (angle > 0.5) {
                paths += '<path d="M' + cx + ',' + cy + ' L' + x1.toFixed(2) + ',' + y1.toFixed(2) +
                    ' A' + r + ',' + r + ' 0 ' + large + ',1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) +
                    ' Z" fill="' + (DONUT_COLORS[i % DONUT_COLORS.length]) + '" opacity=".85"/>';
            }
            cumAngle += angle;
        });
        const inner = r * 0.55;
        paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + inner + '" fill="var(--bg)"/>';
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + paths + '</svg>';
    }

    function _buildAreaChart(dailyData, w, h) {
        if (!dailyData.length) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:40px 0">No data for this period</div>';
        const maxVal = Math.max(...dailyData.map(d => d.value), 1);
        const step = w / Math.max(dailyData.length - 1, 1);
        const pts = dailyData.map((d, i) => {
            const x = (i * step).toFixed(1);
            const y = (h - (d.value / maxVal) * (h * 0.85) - h * 0.05).toFixed(1);
            return { x, y, label: d.label, value: d.value };
        });
        const linePath = 'M' + pts.map(p => p.x + ',' + p.y).join(' L');
        const areaPath = 'M0,' + h + ' L' + pts.map(p => p.x + ',' + p.y).join(' L') + ' L' + (w) + ',' + h + ' Z';

        let gridLines = '';
        for (let i = 0; i <= 4; i++) {
            const gy = (h - (i / 4) * h * 0.85 - h * 0.05).toFixed(1);
            const val = Math.round((i / 4) * maxVal);
            gridLines += '<line x1="0" y1="' + gy + '" x2="' + w + '" y2="' + gy + '" stroke="var(--border)" stroke-width=".5" stroke-dasharray="4,4"/>';
            gridLines += '<text x="2" y="' + (parseFloat(gy) - 3) + '" fill="var(--sub)" font-size="8" font-family="JetBrains Mono,monospace">' + val + '</text>';
        }

        let dots = '';
        pts.forEach((p, i) => {
            dots += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="var(--accent)" opacity="0" data-chart-idx="' + i + '">' +
                '<set attributeName="opacity" to="1" begin="mouseover" end="mouseout"/></circle>';
        });

        const labels = [];
        const labelStep = Math.max(1, Math.floor(dailyData.length / 6));
        for (let i = 0; i < dailyData.length; i += labelStep) labels.push(dailyData[i].label);
        if (dailyData.length > 1 && (dailyData.length - 1) % labelStep !== 0) labels.push(dailyData[dailyData.length - 1].label);

        return '<div class="lb-chart-area"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            gridLines +
            '<path d="' + areaPath + '" fill="var(--accent)" opacity=".08"/>' +
            '<path d="' + linePath + '" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
            dots +
            '</svg><div class="lb-chart-tooltip" id="lbChartTip"></div></div>' +
            '<div class="lb-chart-labels">' + labels.map(l => '<span>' + l + '</span>').join('') + '</div>';
    }

    /* ═══════════════════════════════════════════════════
       C3: READING FUNNEL VISUALIZATION
       ═══════════════════════════════════════════════════ */
    function _buildFunnelChart(readingHistory, w) {
        w = w || 280;
        if (!readingHistory || !Array.isArray(readingHistory)) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No reading data</div>';
        var total = readingHistory.length;
        if (!total) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No reading data</div>';
        var started = readingHistory.filter(function(r) { return (r.progress || 0) > 0; }).length;
        var q25 = readingHistory.filter(function(r) { return (r.progress || 0) >= 25; }).length;
        var q50 = readingHistory.filter(function(r) { return (r.progress || 0) >= 50; }).length;
        var q75 = readingHistory.filter(function(r) { return (r.progress || 0) >= 75; }).length;
        var completed = readingHistory.filter(function(r) { return r.completed; }).length;

        var stages = [
            { label: 'Landed', value: total, pct: 100 },
            { label: 'Started', value: started, pct: Math.round((started / total) * 100) },
            { label: '25%', value: q25, pct: Math.round((q25 / total) * 100) },
            { label: '50%', value: q50, pct: Math.round((q50 / total) * 100) },
            { label: '75%', value: q75, pct: Math.round((q75 / total) * 100) },
            { label: 'Done', value: completed, pct: Math.round((completed / total) * 100) }
        ];

        var colors = ['#00e1ff','#22d3ee','#06b6d4','#0891b2','#0e7490','#155e75'];
        var html = '<div class="lb-funnel">';
        stages.forEach(function(s, i) {
            var barW = Math.max(60, (s.pct / 100) * w);
            html += '<div class="lb-funnel-stage" style="width:' + barW + 'px;background:' + colors[i] + ';opacity:' + (1 - i * 0.12).toFixed(2) + '">' +
                '<span class="lb-funnel-value">' + s.value + '</span>' +
                '<span class="lb-funnel-label">' + s.label + ' (' + s.pct + '%)</span></div>';
        });
        html += '</div>';
        return html;
    }

    /* ═══════════════════════════════════════════════════
       C4: PUBLISHING TIME HEATMAP
       ═══════════════════════════════════════════════════ */
    function _buildPublishHeatmap(articles, visits) {
        var grid = {};
        var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        for (var d = 0; d < 7; d++) for (var h = 0; h < 24; h++) grid[d + ':' + h] = { views: 0, count: 0 };

        articles.forEach(function(a) {
            if (!a.created_at) return;
            var dt = new Date(a.created_at);
            var key = dt.getDay() + ':' + dt.getHours();
            grid[key].views += (a.views || 0);
            grid[key].count++;
        });

        var maxViews = 1;
        Object.values(grid).forEach(function(cell) { if (cell.views > maxViews) maxViews = cell.views; });

        var hours = [];
        for (var h = 0; h < 24; h++) hours.push(h);
        var html = '<div class="lb-heatmap-wrap"><table class="lb-heatmap"><thead><tr><th></th>';
        hours.forEach(function(h) { html += '<th>' + (h < 10 ? '0' : '') + h + '</th>'; });
        html += '</tr></thead><tbody>';

        dayNames.forEach(function(dayName, d) {
            html += '<tr><th>' + dayName + '</th>';
            hours.forEach(function(h) {
                var cell = grid[d + ':' + h];
                var intensity = cell.views / maxViews;
                var bg = 'rgba(0,225,255,' + (intensity * 0.8).toFixed(2) + ')';
                html += '<td style="background:' + bg + '"><div class="lb-heatmap-tip">' + dayName + ' ' + h + ':00 · ' + cell.views + ' views / ' + cell.count + ' posts</div></td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    /* ═══════════════════════════════════════════════════
       C5: PREDICTIVE TRAFFIC FORECASTING
       ═══════════════════════════════════════════════════ */
    function _linearRegression(data) {
        var n = data.length;
        if (n < 3) return { slope: 0, intercept: 0, predict: function() { return 0; } };
        var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        data.forEach(function(d, i) { sumX += i; sumY += d.value; sumXY += i * d.value; sumXX += i * i; });
        var denom = n * sumXX - sumX * sumX;
        if (denom === 0) return { slope: 0, intercept: sumY / n, predict: function(x) { return Math.max(0, Math.round(sumY / n)); } };
        var slope = (n * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        return {
            slope: slope,
            intercept: intercept,
            predict: function(x) { return Math.max(0, Math.round(slope * x + intercept)); }
        };
    }

    function _buildAreaChartWithForecast(dailyData, w, h, forecastDays) {
        if (!dailyData.length) return '<div style="text-align:center;color:var(--sub);font-size:10px;padding:40px 0">No data for this period</div>';

        var reg = _linearRegression(dailyData);
        var forecast = [];
        if (forecastDays && dailyData.length >= 7) {
            for (var f = 0; f < forecastDays; f++) {
                var idx = dailyData.length + f;
                var dt = new Date(Date.now() + (f + 1) * 86400000);
                forecast.push({ label: (dt.getMonth() + 1) + '/' + dt.getDate(), value: reg.predict(idx), date: dt.toISOString().slice(0, 10) });
            }
        }

        var allData = dailyData.concat(forecast);
        var maxVal = Math.max(...allData.map(function(d) { return d.value; }), 1);
        var totalPts = allData.length;
        var step = w / Math.max(totalPts - 1, 1);

        var pts = allData.map(function(d, i) {
            var x = (i * step).toFixed(1);
            var y = (h - (d.value / maxVal) * (h * 0.85) - h * 0.05).toFixed(1);
            return { x: x, y: y, label: d.label, value: d.value };
        });

        var realPts = pts.slice(0, dailyData.length);
        var fcPts = pts.slice(dailyData.length - 1);

        var linePath = 'M' + realPts.map(function(p) { return p.x + ',' + p.y; }).join(' L');
        var areaPath = 'M0,' + h + ' L' + realPts.map(function(p) { return p.x + ',' + p.y; }).join(' L') + ' L' + realPts[realPts.length - 1].x + ',' + h + ' Z';

        var gridLines = '';
        for (var i = 0; i <= 4; i++) {
            var gy = (h - (i / 4) * h * 0.85 - h * 0.05).toFixed(1);
            var val = Math.round((i / 4) * maxVal);
            gridLines += '<line x1="0" y1="' + gy + '" x2="' + w + '" y2="' + gy + '" stroke="var(--border)" stroke-width=".5" stroke-dasharray="4,4"/>';
            gridLines += '<text x="2" y="' + (parseFloat(gy) - 3) + '" fill="var(--sub)" font-size="8" font-family="JetBrains Mono,monospace">' + val + '</text>';
        }

        var forecastSvg = '';
        if (fcPts.length > 1) {
            var fcLine = 'M' + fcPts.map(function(p) { return p.x + ',' + p.y; }).join(' L');
            var fcArea = 'M' + fcPts[0].x + ',' + h + ' L' + fcPts.map(function(p) { return p.x + ',' + p.y; }).join(' L') + ' L' + fcPts[fcPts.length - 1].x + ',' + h + ' Z';
            forecastSvg = '<path d="' + fcArea + '" class="lb-forecast-band" fill="var(--accent)"/>' +
                '<path d="' + fcLine + '" class="lb-forecast-line" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        }

        var labels = [];
        var labelStep = Math.max(1, Math.floor(allData.length / 6));
        for (var i = 0; i < allData.length; i += labelStep) labels.push(allData[i].label);

        return '<div class="lb-chart-area"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            gridLines +
            '<path d="' + areaPath + '" fill="var(--accent)" opacity=".08"/>' +
            '<path d="' + linePath + '" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
            forecastSvg +
            '</svg></div>' +
            '<div class="lb-chart-labels">' + labels.map(function(l) { return '<span>' + l + '</span>'; }).join('') + '</div>' +
            (forecast.length ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:8px;color:var(--sub);margin-top:4px;text-align:right">Dashed = ' + forecastDays + '-day forecast (linear regression)</div>' : '');
    }

    /* ═══════════════════════════════════════════════════
       C6: COMPARATIVE ARTICLE ANALYSIS (Radar Chart)
       ═══════════════════════════════════════════════════ */
    function _buildRadarChart(articles, data, size) {
        size = size || 220;
        var cx = size / 2, cy = size / 2, r = size / 2 - 30;
        var dims = ['Views','Reactions','Comments','Completion','Time Spent'];
        var angleStep = (2 * Math.PI) / dims.length;
        var colors = ['#00e1ff','#f59e0b','#22c55e','#ec4899','#8b5cf6'];

        var maxVals = dims.map(function() { return 1; });
        articles.forEach(function(a) {
            var vals = _getArticleDimValues(a, data);
            vals.forEach(function(v, i) { if (v > maxVals[i]) maxVals[i] = v; });
        });

        var axisLines = '', axisLabels = '';
        dims.forEach(function(dim, i) {
            var angle = -Math.PI / 2 + i * angleStep;
            var x = cx + r * Math.cos(angle);
            var y = cy + r * Math.sin(angle);
            axisLines += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-width="0.5"/>';
            var lx = cx + (r + 18) * Math.cos(angle);
            var ly = cy + (r + 18) * Math.sin(angle);
            axisLabels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" dominant-baseline="central" fill="var(--sub)" font-size="8" font-family="JetBrains Mono,monospace">' + dim + '</text>';
        });

        var gridRings = '';
        [0.25, 0.5, 0.75, 1].forEach(function(pct) {
            var pts = dims.map(function(_, i) {
                var angle = -Math.PI / 2 + i * angleStep;
                return (cx + r * pct * Math.cos(angle)).toFixed(1) + ',' + (cy + r * pct * Math.sin(angle)).toFixed(1);
            }).join(' ');
            gridRings += '<polygon points="' + pts + '" fill="none" stroke="var(--border)" stroke-width="0.5" opacity=".4"/>';
        });

        var polygons = '';
        articles.forEach(function(a, ai) {
            var vals = _getArticleDimValues(a, data);
            var pts = vals.map(function(v, i) {
                var norm = maxVals[i] ? v / maxVals[i] : 0;
                var angle = -Math.PI / 2 + i * angleStep;
                return (cx + r * norm * Math.cos(angle)).toFixed(1) + ',' + (cy + r * norm * Math.sin(angle)).toFixed(1);
            }).join(' ');
            polygons += '<polygon points="' + pts + '" fill="' + colors[ai % colors.length] + '" fill-opacity=".15" stroke="' + colors[ai % colors.length] + '" stroke-width="2"/>';
        });

        var legend = articles.map(function(a, i) {
            return '<div class="lb-radar-item"><span class="lb-radar-swatch" style="background:' + colors[i % colors.length] + '"></span>' + esc((a.title || '').slice(0, 30)) + '</div>';
        }).join('');

        return '<div class="lb-radar-wrap"><svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
            gridRings + axisLines + polygons + axisLabels + '</svg>' +
            '<div class="lb-radar-legend">' + legend + '</div></div>';
    }

    function _getArticleDimValues(article, data) {
        var rx = article.reactions || {};
        var totalRx = Object.values(rx).reduce(function(s, v) { return s + (v || 0); }, 0);
        var comments = (data.comments || []).filter(function(c) { return c.article_id === article.id; }).length;
        var hist = (data.readingHistory || []).filter(function(r) { return r.article_id === article.id; });
        var avgComp = hist.length ? hist.reduce(function(s, r) { return s + (r.progress || 0); }, 0) / hist.length * 100 : 0;
        var avgTime = hist.length ? hist.reduce(function(s, r) { return s + (r.time_spent || 0); }, 0) / hist.length / 60 : 0;
        return [article.views || 0, totalRx, comments, avgComp, avgTime];
    }

    function _showCompareOverlay(selectedSlugs, data) {
        if (!data || !data.published) return;
        var articles = data.published.filter(function(a) { return a.slug && selectedSlugs.indexOf(a.slug) >= 0; });
        if (articles.length < 2) { if (window.UniToast) window.UniToast('Select at least 2 articles to compare', '', '⚠️', 'warn'); return; }
        var overlay = document.createElement('div');
        overlay.className = 'lb-compare-overlay';
        overlay.innerHTML = '<div class="lb-compare-modal">' +
            '<button class="lb-compare-close">ESC</button>' +
            '<div style="font-family:Inter,sans-serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:16px">Comparative Analysis</div>' +
            _buildRadarChart(articles, data, 240) +
            '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.lb-compare-close').addEventListener('click', function() { overlay.remove(); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    }

    function _aggregateDaily(visits, days) {
        const buckets = {};
        const now = Date.now();
        let d = days;
        if (!d && visits.length) {
            const oldest = new Date(visits[0].created_at).getTime();
            d = Math.max(7, Math.ceil((now - oldest) / 86400000) + 1);
        }
        d = d || 30;
        for (let i = 0; i < d; i++) {
            const dt = new Date(now - (d - 1 - i) * 86400000);
            const key = dt.toISOString().slice(0, 10);
            buckets[key] = 0;
        }
        visits.forEach(v => {
            const key = new Date(v.created_at).toISOString().slice(0, 10);
            if (key in buckets) buckets[key]++;
        });
        return Object.entries(buckets).map(([k, v]) => ({
            label: k.slice(5),
            value: v,
            date: k
        }));
    }

    function _computeDelta(cur, prev) {
        if (!prev) return { pct: 0, dir: 'flat' };
        const pct = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
        return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
    }

    function _deltaHTML(delta) {
        const arrow = delta.dir === 'up' ? '\u25b2' : delta.dir === 'down' ? '\u25bc' : '\u2014';
        return '<span class="lb-kpi-delta ' + delta.dir + '">' + arrow + ' ' + delta.pct + '%</span>';
    }

    function _getDailySparkData(visits, days) {
        const d = days || 7;
        const buckets = [];
        const now = Date.now();
        for (let i = 0; i < d; i++) {
            const dt = new Date(now - (d - 1 - i) * 86400000);
            const key = dt.toISOString().slice(0, 10);
            buckets.push({ key, count: 0 });
        }
        visits.forEach(v => {
            const key = new Date(v.created_at).toISOString().slice(0, 10);
            const b = buckets.find(b => b.key === key);
            if (b) b.count++;
        });
        return buckets.map(b => b.count);
    }

    function _extractDomain(referrer) {
        if (!referrer) return '(direct)';
        try {
            const u = new URL(referrer);
            return u.hostname.replace(/^www\./, '');
        } catch (e) { return referrer.slice(0, 40); }
    }

    function _renderDrillDown(article, data) {
        const articleComments = data.comments.filter(c => c.article_id === article.id);
        const articleHistory = data.readingHistory.filter(r => r.article_id === article.id);
        const articleVisits = data.blogVisits.filter(v => v.page_url && v.page_url.includes(article.slug));

        const rx = article.reactions || {};
        const rxKeys = ['heart', 'fire', 'bulb', 'clap', 'target'];
        const rxIcons = { heart: '\u2764\ufe0f', fire: '\ud83d\udd25', bulb: '\ud83d\udca1', clap: '\ud83d\udc4f', target: '\ud83c\udfaf' };
        const rxMax = Math.max(...rxKeys.map(k => rx[k] || 0), 1);

        const avgProg = articleHistory.length
            ? Math.round(articleHistory.reduce((s, r) => s + (r.progress || 0), 0) / articleHistory.length * 100)
            : 0;
        const avgTime = articleHistory.length
            ? Math.round(articleHistory.reduce((s, r) => s + (r.time_spent || 0), 0) / articleHistory.length)
            : 0;
        const compRate = articleHistory.length
            ? Math.round(articleHistory.filter(r => r.completed).length / articleHistory.length * 100)
            : 0;

        const refCounts = {};
        articleVisits.forEach(v => {
            const d = _extractDomain(v.referrer);
            refCounts[d] = (refCounts[d] || 0) + 1;
        });
        const topRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const dailyVisits = _aggregateDaily(articleVisits, _analyticsDays);

        const overlay = document.createElement('div');
        overlay.className = 'lb-drill-overlay';
        overlay.innerHTML =
            '<div class="lb-drill-modal">' +
            '<button class="lb-drill-close" aria-label="Close drill-down">ESC</button>' +
            '<div class="lb-drill-title">' + esc(article.title) + '</div>' +
            '<div class="lb-drill-subtitle">' + esc(article.slug) + ' \u00b7 ' + fmtDate(article.created_at) + '</div>' +
            '<div class="lb-drill-kpis">' +
                '<div class="lb-drill-kpi"><div class="lb-drill-kpi-value">' + (article.views || 0) + '</div><div class="lb-drill-kpi-label">Views</div></div>' +
                '<div class="lb-drill-kpi"><div class="lb-drill-kpi-value">' + articleComments.length + '</div><div class="lb-drill-kpi-label">Comments</div></div>' +
                '<div class="lb-drill-kpi"><div class="lb-drill-kpi-value">' + Object.values(rx).reduce((s, v) => s + (v || 0), 0) + '</div><div class="lb-drill-kpi-label">Reactions</div></div>' +
            '</div>' +
            '<div class="lb-drill-grid">' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">VIEWS OVER TIME</div>' +
                    _buildAreaChart(dailyVisits, 280, 100) +
                '</div>' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">REACTIONS BREAKDOWN</div>' +
                    '<div class="lb-reaction-bar-chart">' +
                    rxKeys.map(k => {
                        const val = rx[k] || 0;
                        const h = Math.max(2, (val / rxMax) * 60);
                        return '<div class="lb-rx-bar-col">' +
                            '<div class="lb-rx-bar-val">' + val + '</div>' +
                            '<div class="lb-rx-bar" style="height:' + h + 'px"></div>' +
                            '<div class="lb-rx-bar-icon">' + (rxIcons[k] || k) + '</div></div>';
                    }).join('') +
                    '</div>' +
                '</div>' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">READER ENGAGEMENT</div>' +
                    '<div class="lb-engagement-metrics">' +
                        '<div class="lb-eng-card"><div class="lb-eng-value">' + avgProg + '%</div><div class="lb-eng-label">Avg Progress</div></div>' +
                        '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(avgTime / 60) + 'm</div><div class="lb-eng-label">Avg Time</div></div>' +
                        '<div class="lb-eng-card"><div class="lb-eng-value">' + compRate + '%</div><div class="lb-eng-label">Completion</div></div>' +
                    '</div>' +
                    '<div style="margin-top:12px"><div class="lb-drill-section-title">READING FUNNEL</div>' + _buildFunnelChart(articleHistory, 240) + '</div>' +
                '</div>' +
                '<div class="lb-drill-section">' +
                    '<div class="lb-drill-section-title">TOP REFERRERS</div>' +
                    (topRefs.length ? topRefs.map((r, i) =>
                        '<div class="lb-ref-row"><span class="lb-ref-rank">' + (i + 1) + '</span><span class="lb-ref-domain">' + esc(r[0]) + '</span><span class="lb-ref-count">' + r[1] + '</span></div>'
                    ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:12px">No referrer data</div>') +
                '</div>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        overlay.querySelector('.lb-drill-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        const escHandler = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
    }

    function _exportCSV(data) {
        const rows = [['Title', 'Slug', 'Views', 'Reactions', 'Comments', 'Tags', 'Published Date']];
        const commentsByArticle = {};
        data.comments.forEach(c => { commentsByArticle[c.article_id] = (commentsByArticle[c.article_id] || 0) + 1; });

        data.published.forEach(a => {
            const rx = a.reactions || {};
            const totalRx = Object.values(rx).reduce((s, v) => s + (v || 0), 0);
            rows.push([
                '"' + (a.title || '').replace(/"/g, '""') + '"',
                a.slug,
                a.views || 0,
                totalRx,
                commentsByArticle[a.id] || 0,
                '"' + (a.tags || []).join(', ') + '"',
                a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : ''
            ]);
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blog-analytics-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        if (window.UniToast) window.UniToast('CSV exported', '', '\u2913', 'success');
    }

    function _bindCompareCheckboxes(wrap, data) {
        var compareBtn = wrap.querySelector('#lbCompareBtn');
        var checks = wrap.querySelectorAll('.lb-perf-compare-check');
        var selectAll = wrap.querySelector('.lb-perf-select-all');
        function updateBtn() {
            var selected = wrap.querySelectorAll('.lb-perf-compare-check:checked');
            if (compareBtn) compareBtn.style.display = selected.length >= 2 ? '' : 'none';
        }
        checks.forEach(function(cb) { cb.addEventListener('change', updateBtn); });
        if (selectAll) selectAll.addEventListener('change', function() {
            checks.forEach(function(cb) { cb.checked = selectAll.checked; });
            updateBtn();
        });
        if (compareBtn) compareBtn.addEventListener('click', function() {
            var slugs = [];
            wrap.querySelectorAll('.lb-perf-compare-check:checked').forEach(function(cb) { slugs.push(cb.dataset.compareSlug); });
            if (slugs.length >= 2) _showCompareOverlay(slugs.slice(0, 5), data);
        });
    }

    async function renderAnalyticsDashboard() {
        const container = document.getElementById('lbAnalyticsContent');
        if (!container || !window._sb) return;
        container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">\ud83d\udcca</div>Loading analytics...</div>';

        try {
            const data = await _fetchAnalyticsData(_analyticsDays);
            if (!data) return;
            _analyticsCache = data;

            const dailyBlog = _aggregateDaily(data.blogVisits, _analyticsDays);
            const sparkVisits = _getDailySparkData(data.blogVisits, 7);
            const sparkComments = _getDailySparkData(data.comments, 7);

            const viewDelta = _computeDelta(data.curUniqueVisitors, data.prevUniqueVisitors);
            const prevComments = data.prevVisits.length ? Math.round(data.comments.length * 0.8) : 0;
            const commentDelta = _computeDelta(data.comments.length, prevComments);

            // Geographic breakdown
            const geoCounts = {};
            data.blogVisits.forEach(v => { if (v.country) geoCounts[v.country] = (geoCounts[v.country] || 0) + 1; });
            const geoTop = Object.entries(geoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const geoMax = geoTop.length ? geoTop[0][1] : 1;

            // Device breakdown
            const mobileCnt = data.blogVisits.filter(v => v.is_mobile).length;
            const desktopCnt = data.blogVisits.length - mobileCnt;
            const deviceSegments = [{ label: 'Desktop', value: desktopCnt }, { label: 'Mobile', value: mobileCnt }].filter(s => s.value > 0);

            // Browser breakdown
            const browserCounts = {};
            data.blogVisits.forEach(v => { if (v.browser) browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1; });
            const browserTop = Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const browserSegments = browserTop.map(([name, val]) => ({ label: name, value: val }));

            // Referrer analysis
            const refCounts = {};
            data.blogVisits.forEach(v => { const d = _extractDomain(v.referrer); refCounts[d] = (refCounts[d] || 0) + 1; });
            const refTop = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

            // Tag performance
            const tagViews = {};
            data.published.forEach(a => { (a.tags || []).forEach(t => { tagViews[t] = (tagViews[t] || 0) + (a.views || 0); }); });
            const tagTop = Object.entries(tagViews).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const tagMax = tagTop.length ? tagTop[0][1] : 1;

            // Newsletter growth
            const subDaily = {};
            data.subscribers.forEach(s => {
                const key = new Date(s.created_at).toISOString().slice(0, 10);
                subDaily[key] = (subDaily[key] || 0) + 1;
            });
            let subCum = 0;
            const subGrowth = Object.entries(subDaily).sort().map(([k, v]) => { subCum += v; return { label: k.slice(5), value: subCum }; });

            // Content performance table
            const commentsByArticle = {};
            data.comments.forEach(c => { commentsByArticle[c.article_id] = (commentsByArticle[c.article_id] || 0) + 1; });
            const historyByArticle = {};
            data.readingHistory.forEach(r => {
                if (!historyByArticle[r.article_id]) historyByArticle[r.article_id] = [];
                historyByArticle[r.article_id].push(r);
            });

            /* ── C1: Advanced Engagement Scoring ── */
            let perfData = data.published.map(a => {
                const rx = a.reactions || {};
                const totalRx = Object.values(rx).reduce((s, v) => s + (v || 0), 0);
                const cCount = commentsByArticle[a.id] || 0;
                const hist = historyByArticle[a.id] || [];
                const avgComp = hist.length ? Math.round(hist.reduce((s, r) => s + (r.progress || 0), 0) / hist.length * 100) : 0;
                const avgTime = hist.length ? hist.reduce((s, r) => s + (r.time_spent || 0), 0) / hist.length / 60 : 0;
                const rawScore = (a.views || 0) * 1 + totalRx * 5 + cCount * 10 + (avgComp / 100) * 20 + avgTime * 2;
                return { ...a, totalRx, cCount, avgComp, avgTime, rawScore };
            });

            const maxRaw = Math.max(...perfData.map(p => p.rawScore), 1);
            perfData.forEach(a => {
                a.engScore = Math.round((a.rawScore / maxRaw) * 100);
                a.engGrade = a.engScore >= 90 ? 'A+' : a.engScore >= 80 ? 'A' : a.engScore >= 70 ? 'B+' : a.engScore >= 60 ? 'B' : a.engScore >= 50 ? 'C+' : a.engScore >= 40 ? 'C' : a.engScore >= 30 ? 'D' : 'F';
                a.engColor = a.engScore >= 70 ? '#22c55e' : a.engScore >= 50 ? '#f59e0b' : '#ef4444';
            });

            /* ── C2: Content Decay Detection ── */
            perfData.forEach(a => {
                const articleVisits = data.blogVisits.filter(v => v.page_url && v.page_url.includes(a.slug));
                const now = Date.now();
                const last7 = articleVisits.filter(v => (now - new Date(v.created_at).getTime()) < 7 * 86400000).length;
                const ageInDays = Math.max(1, (now - new Date(a.created_at).getTime()) / 86400000);
                const lifetimeDaily = (a.views || 0) / ageInDays;
                const recent7Daily = last7 / 7;
                if (lifetimeDaily < 0.1) { a.trend = 'stable'; a.trendIcon = '—'; a.trendColor = 'var(--sub)'; }
                else if (recent7Daily > lifetimeDaily * 1.5) { a.trend = 'up'; a.trendIcon = '▲'; a.trendColor = '#22c55e'; }
                else if (recent7Daily >= lifetimeDaily * 0.7) { a.trend = 'stable'; a.trendIcon = '—'; a.trendColor = 'var(--sub)'; }
                else if (recent7Daily >= lifetimeDaily * 0.3) { a.trend = 'declining'; a.trendIcon = '▼'; a.trendColor = '#f59e0b'; }
                else { a.trend = 'attention'; a.trendIcon = '⚠'; a.trendColor = '#ef4444'; }
            });

            const healthCounts = { up:0, stable:0, declining:0, attention:0 };
            perfData.forEach(a => { healthCounts[a.trend] = (healthCounts[a.trend] || 0) + 1; });

            const sortPerfData = (col, asc) => {
                const key = { title: 'title', views: 'views', reactions: 'totalRx', comments: 'cCount', completion: 'avgComp', score: 'engScore', trend: 'trend' }[col] || 'views';
                perfData.sort((a, b) => {
                    const av = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
                    const bv = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
                    return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
                });
            };
            sortPerfData(_analyticsSortCol, _analyticsSortAsc);

            const renderPerfTable = () => {
                const cols = [
                    { key: 'title', label: 'Article' },
                    { key: 'views', label: 'Views' },
                    { key: 'reactions', label: 'Rx' },
                    { key: 'comments', label: 'Cmt' },
                    { key: 'completion', label: 'Comp%' },
                    { key: 'score', label: 'Eng. Score' },
                    { key: 'trend', label: 'Trend' }
                ];
                return '<table class="lb-perf-table"><thead><tr>' +
                    cols.map(c => {
                        const sorted = _analyticsSortCol === c.key;
                        const arrow = sorted ? (_analyticsSortAsc ? '\u25b2' : '\u25bc') : '\u25bc';
                        return '<th data-perf-sort="' + c.key + '" class="' + (sorted ? 'sorted' : '') + '">' + c.label + ' <span class="sort-arrow">' + arrow + '</span></th>';
                    }).join('') +
                    '<th style="width:30px"><input type="checkbox" class="lb-perf-select-all" title="Select for comparison"></th>' +
                    '</tr></thead><tbody>' +
                    perfData.map(a =>
                        '<tr><td data-perf-drill="' + esc(a.slug) + '" title="' + esc(a.title) + '">' + esc(a.title) + '</td>' +
                        '<td>' + (a.views || 0) + '</td>' +
                        '<td>' + a.totalRx + '</td>' +
                        '<td>' + a.cCount + '</td>' +
                        '<td>' + a.avgComp + '%</td>' +
                        '<td><span style="display:inline-flex;align-items:center;gap:4px"><span style="background:' + a.engColor + ';color:#000;font-weight:700;padding:1px 5px;border-radius:3px;font-size:8px">' + a.engGrade + '</span> ' + a.engScore + '</span></td>' +
                        '<td><span style="color:' + a.trendColor + ';font-weight:700" title="' + a.trend + '">' + a.trendIcon + '</span></td>' +
                        '<td><input type="checkbox" class="lb-perf-compare-check" data-compare-slug="' + esc(a.slug) + '"></td>' +
                        '</tr>'
                    ).join('') +
                    '</tbody></table>' +
                    '<button class="lb-cms-btn secondary" id="lbCompareBtn" style="margin-top:8px;padding:4px 12px;font-size:9px;display:none">Compare Selected</button>';
            };

            // Build dashboard HTML
            container.innerHTML =
                '<div class="lb-analytics-dash">' +

                // Toolbar
                '<div class="lb-analytics-toolbar">' +
                    '<div class="lb-date-pills">' +
                        [7, 30, 90, 0].map(d => {
                            const isActive = d === 0 ? !_analyticsDays : _analyticsDays === d;
                            return '<button class="lb-date-pill' + (isActive ? ' active' : '') +
                            '" data-analytics-days="' + d + '">' + (d ? d + 'd' : 'All') + '</button>';
                        }).join('') +
                    '</div>' +
                    '<button class="lb-analytics-export" id="lbExportCSV">\u2913 EXPORT CSV</button>' +
                '</div>' +

                // ── Real-Time Live Dashboard ──
                '<div class="lb-analytics-panel full-width lb-realtime-panel" style="grid-column:1/-1">' +
                    '<div class="lb-analytics-panel-title">LIVE ACTIVITY <span class="lb-realtime-dot"></span></div>' +
                    '<div class="lb-realtime-kpis">' +
                        '<div class="lb-realtime-stat"><span id="lbLiveVisitors">—</span><small>Active Now</small></div>' +
                        '<div class="lb-realtime-stat"><span id="lbLiveEvents">0</span><small>Events (5m)</small></div>' +
                    '</div>' +
                    '<div class="lb-realtime-feed" id="lbRealtimeFeed"><div style="font-size:10px;color:var(--sub);padding:8px">Connecting to realtime feed...</div></div>' +
                '</div>' +

                // KPI Cards
                '<div class="lb-analytics-kpis">' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.totalViews + '</div><div class="lb-kpi-label">Total Views</div>' + _deltaHTML(viewDelta) + '<div class="lb-kpi-sparkline">' + _buildSparklineSVG(sparkVisits, 170, 32) + '</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.published.length + '</div><div class="lb-kpi-label">Published</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.totalComments + '</div><div class="lb-kpi-label">Comments</div>' + _deltaHTML(commentDelta) + '<div class="lb-kpi-sparkline">' + _buildSparklineSVG(sparkComments, 170, 32) + '</div></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.totalReactions + '</div><div class="lb-kpi-label">Reactions</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + data.subscriberCount + '</div><div class="lb-kpi-label">Subscribers</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value">' + Math.round(data.avgCompletion * 100) + '%</div><div class="lb-kpi-label">Avg Read Completion</div><span class="lb-kpi-delta flat">\u2014</span></div>' +
                    '<div class="lb-kpi-card"><div class="lb-kpi-value" style="font-size:16px"><span style="color:#22c55e">' + healthCounts.up + '</span> <span style="color:var(--sub)">' + healthCounts.stable + '</span> <span style="color:#f59e0b">' + healthCounts.declining + '</span> <span style="color:#ef4444">' + healthCounts.attention + '</span></div><div class="lb-kpi-label">Content Health (▲ — ▼ ⚠)</div></div>' +
                '</div>' +

                // Views chart (full width)
                '<div class="lb-analytics-panel full-width">' +
                    '<div class="lb-analytics-panel-title">BLOG TRAFFIC <span style="font-weight:400;font-size:8px">' + data.blogVisits.length + ' visits · with forecast</span></div>' +
                    _buildAreaChartWithForecast(dailyBlog, 600, 180, 14) +
                '</div>' +

                // Grid: Geo + Device/Browser
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">GEOGRAPHIC BREAKDOWN</div>' +
                        (geoTop.length ? geoTop.map(([country, cnt]) =>
                            '<div class="lb-geo-row">' +
                            '<span class="lb-geo-flag">' + (COUNTRY_FLAGS[country] || '\ud83c\udf10') + '</span>' +
                            '<span class="lb-geo-name">' + esc(country) + '</span>' +
                            '<div class="lb-geo-bar"><div class="lb-geo-bar-fill" style="width:' + Math.max(3, (cnt / geoMax) * 100) + '%"></div></div>' +
                            '<span class="lb-geo-count">' + cnt + '</span></div>'
                        ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No geographic data</div>') +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">DEVICE SPLIT</div>' +
                        (deviceSegments.length ? '<div class="lb-donut-wrap">' +
                            _buildDonutSVG(deviceSegments, 100) +
                            '<div class="lb-donut-legend">' +
                            deviceSegments.map((s, i) =>
                                '<div class="lb-donut-item"><span class="lb-donut-swatch" style="background:' + DONUT_COLORS[i % DONUT_COLORS.length] + '"></span>' + esc(s.label) +
                                '<span class="lb-donut-pct">' + Math.round(s.value / Math.max(data.blogVisits.length, 1) * 100) + '%</span></div>'
                            ).join('') +
                            '</div></div>' : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No device data</div>') +
                        (browserSegments.length ? '<div style="margin-top:16px"><div class="lb-analytics-panel-title" style="margin-bottom:10px">BROWSER</div><div class="lb-donut-wrap">' +
                            _buildDonutSVG(browserSegments, 80) +
                            '<div class="lb-donut-legend">' +
                            browserSegments.map((s, i) =>
                                '<div class="lb-donut-item"><span class="lb-donut-swatch" style="background:' + DONUT_COLORS[i % DONUT_COLORS.length] + '"></span>' + esc(s.label) +
                                '<span class="lb-donut-pct">' + Math.round(s.value / Math.max(data.blogVisits.length, 1) * 100) + '%</span></div>'
                            ).join('') +
                            '</div></div></div>' : '') +
                    '</div>' +
                '</div>' +

                // Grid: Referrers + Engagement
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">TOP REFERRERS</div>' +
                        (refTop.length ? refTop.map(([domain, cnt], i) =>
                            '<div class="lb-ref-row"><span class="lb-ref-rank">' + (i + 1) + '</span><span class="lb-ref-domain">' + esc(domain) + '</span><span class="lb-ref-count">' + cnt + '</span></div>'
                        ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No referrer data</div>') +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">READER ENGAGEMENT</div>' +
                        '<div class="lb-engagement-metrics">' +
                            '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(data.avgCompletion * 100) + '%</div><div class="lb-eng-label">Avg Progress</div></div>' +
                            '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(data.avgTimeSpent / 60) + 'm</div><div class="lb-eng-label">Avg Time Spent</div></div>' +
                            '<div class="lb-eng-card"><div class="lb-eng-value">' + Math.round(data.completionRate * 100) + '%</div><div class="lb-eng-label">Completion Rate</div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                // Grid: Tag performance + Newsletter growth
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">TAG PERFORMANCE</div>' +
                        (tagTop.length ? tagTop.map(([tag, views]) =>
                            '<div class="lb-tag-perf-row"><span class="lb-tag-perf-name">' + esc(tag) + '</span>' +
                            '<div class="lb-tag-perf-bar"><div class="lb-tag-perf-bar-fill" style="width:' + Math.max(3, (views / tagMax) * 100) + '%"></div></div>' +
                            '<span class="lb-tag-perf-val">' + views + ' views</span></div>'
                        ).join('') : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No tag data</div>') +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">NEWSLETTER GROWTH</div>' +
                        (subGrowth.length ? _buildAreaChart(subGrowth, 280, 120) : '<div style="text-align:center;color:var(--sub);font-size:10px;padding:20px">No subscriber data</div>') +
                    '</div>' +
                '</div>' +

                // C3: Reading Funnel + C4: Publishing Time Heatmap
                '<div class="lb-analytics-grid">' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">READING FUNNEL</div>' +
                        _buildFunnelChart(data.readingHistory, 260) +
                    '</div>' +
                    '<div class="lb-analytics-panel">' +
                        '<div class="lb-analytics-panel-title">BEST PUBLISHING TIME</div>' +
                        _buildPublishHeatmap(data.published, data.blogVisits) +
                    '</div>' +
                '</div>' +

                // Content performance table
                '<div class="lb-analytics-panel full-width" style="grid-column:1/-1">' +
                    '<div class="lb-analytics-panel-title">CONTENT PERFORMANCE <span style="font-weight:400;font-size:8px">' + perfData.length + ' articles</span></div>' +
                    '<div id="lbPerfTableWrap">' + renderPerfTable() + '</div>' +
                '</div>' +

                // Recent comments
                (data.recentComments.length ? '<div class="lb-analytics-panel full-width" style="grid-column:1/-1">' +
                    '<div class="lb-analytics-panel-title">RECENT COMMENTS</div>' +
                    data.recentComments.map(c =>
                        '<div class="lb-activity-row">' +
                        '<span class="lb-activity-author">' + esc(c.author_name) + '</span>' +
                        '<span class="lb-activity-text">' + esc((c.content || '').slice(0, 80)) + '</span>' +
                        '<span class="lb-activity-time">' + B.timeAgo(c.created_at) + '</span></div>'
                    ).join('') +
                '</div>' : '') +

                // ── Predictive Analytics ──
                '<div class="lb-analytics-panel full-width" style="grid-column:1/-1" id="lbPredictivePanel">' +
                    '<div class="lb-analytics-panel-title">PREDICTIVE ANALYTICS</div>' +
                    '<div style="color:var(--sub);font-size:10px;padding:8px">Computing predictions...</div>' +
                '</div>' +

                '</div>';

            // Bind date pill switching
            container.querySelectorAll('.lb-date-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const d = parseInt(pill.dataset.analyticsDays, 10);
                    _analyticsDays = d || null;
                    renderAnalyticsDashboard();
                });
            });

            // Bind CSV export
            const exportBtn = document.getElementById('lbExportCSV');
            if (exportBtn) exportBtn.addEventListener('click', () => _exportCSV(data));

            // Bind table sorting + drill-down via event delegation
            const perfWrap = document.getElementById('lbPerfTableWrap');
            if (perfWrap) {
                perfWrap.addEventListener('click', function(e) {
                    const sortTh = e.target.closest('[data-perf-sort]');
                    if (sortTh) {
                        const col = sortTh.dataset.perfSort;
                        if (_analyticsSortCol === col) _analyticsSortAsc = !_analyticsSortAsc;
                        else { _analyticsSortCol = col; _analyticsSortAsc = false; }
                        sortPerfData(_analyticsSortCol, _analyticsSortAsc);
                        perfWrap.innerHTML = renderPerfTable();
                        _bindCompareCheckboxes(perfWrap, data);
                        return;
                    }
                    const drillTd = e.target.closest('[data-perf-drill]');
                    if (drillTd) {
                        const slug = drillTd.dataset.perfDrill;
                        const article = data.published.find(a => a.slug === slug);
                        if (article) _renderDrillDown(article, data);
                    }
                });
                _bindCompareCheckboxes(perfWrap, data);
            }

            // ── Start Realtime Subscription ──
            _startRealtimeFeed(data);

            // ── Render Predictive Analytics ──
            _renderPredictive(data);

        } catch (e) {
            console.error('[blog] Analytics error:', e);
            container.innerHTML = '<div class="lb-empty"><div class="lb-empty-icon">\u26a0\ufe0f</div>Failed to load analytics.</div>';
        }
    }

    /* ═══════════════════════════════════════════════════
       REAL-TIME LIVE DASHBOARD
       ═══════════════════════════════════════════════════ */
    let _realtimeChannel = null;
    let _realtimeEvents = [];

    function _startRealtimeFeed(data) {
        const feed = document.getElementById('lbRealtimeFeed');
        const liveEvEl = document.getElementById('lbLiveEvents');
        const liveVisEl = document.getElementById('lbLiveVisitors');
        if (!feed || !window._sb) return;

        if (_realtimeChannel) {
            window._sb.removeChannel(_realtimeChannel);
            _realtimeChannel = null;
        }

        const articleMap = {};
        (data.articles || data.published || []).forEach(a => { articleMap[a.id] = a.title; });

        const eventLabels = {
            share_x: 'Shared on X', share_linkedin: 'Shared on LinkedIn', share_whatsapp: 'Shared on WhatsApp',
            share_telegram: 'Shared on Telegram', share_email: 'Shared via Email', copy_link: 'Copied link',
            bookmark: 'Bookmarked', tts_start: 'Started listening', reaction: 'Reacted to', comment_submit: 'Commented on',
            impression: 'Viewed section in', scroll_50: 'Read 50% of', scroll_100: 'Finished reading'
        };

        feed.innerHTML = '<div style="font-size:10px;color:var(--sub);padding:4px">Waiting for events...</div>';
        _realtimeEvents = [];

        const activeSessions = new Set();

        _realtimeChannel = window._sb
            .channel('analytics-events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'article_events' }, payload => {
                const evt = payload.new;
                if (!evt) return;

                activeSessions.add(evt.session_id);
                if (liveVisEl) liveVisEl.textContent = activeSessions.size;

                _realtimeEvents.unshift(evt);
                if (_realtimeEvents.length > 50) _realtimeEvents.length = 50;
                if (liveEvEl) liveEvEl.textContent = _realtimeEvents.length;

                const label = eventLabels[evt.event_type] || evt.event_type;
                const artTitle = evt.article_id && articleMap[evt.article_id] ? articleMap[evt.article_id] : '';
                const timeStr = B.timeAgo ? B.timeAgo(evt.created_at) : 'just now';

                const row = document.createElement('div');
                row.className = 'lb-realtime-row';
                row.innerHTML = '<span class="lb-realtime-label">' + esc(label) + '</span>' +
                    (artTitle ? ' <span class="lb-realtime-article">' + esc(artTitle.slice(0, 40)) + '</span>' : '') +
                    (evt.mood ? ' <span class="lb-realtime-mood">' + esc(evt.mood) + '</span>' : '') +
                    '<span class="lb-realtime-time">' + esc(timeStr) + '</span>';

                feed.insertBefore(row, feed.firstChild);
                while (feed.children.length > 20) feed.removeChild(feed.lastChild);
            })
            .subscribe();
    }

    /* ═══════════════════════════════════════════════════
       PREDICTIVE ANALYTICS
       ═══════════════════════════════════════════════════ */
    function _renderPredictive(data) {
        const panel = document.getElementById('lbPredictivePanel');
        if (!panel) return;

        const published = data.published || [];
        if (!published.length) {
            panel.innerHTML = '<div class="lb-analytics-panel-title">PREDICTIVE ANALYTICS</div>' +
                '<div style="font-size:10px;color:var(--sub);padding:12px">Not enough data for predictions.</div>';
            return;
        }

        // Holt-Winters (double exponential smoothing) for view forecast
        const dailyViews = _dailyAggregation(data.blogVisits, _analyticsDays || 90);
        const forecast = _holtWinters(dailyViews.map(d => d.value), 0.3, 0.1, 14);

        // Content velocity — articles sorted by views/day acceleration
        const velocities = published.map(a => {
            const age = Math.max(1, (Date.now() - new Date(a.created_at).getTime()) / 86400000);
            return { title: a.title, slug: a.slug, velocity: ((a.views || 0) / age).toFixed(1), views: a.views || 0 };
        }).sort((a, b) => b.velocity - a.velocity).slice(0, 5);

        // Subscriber growth forecast (simple linear extrapolation)
        const subCount = data.subscriberCount || 0;
        const subRate = data.subscribers && data.subscribers.length > 1
            ? data.subscribers.length / Math.max(1, (Date.now() - new Date(data.subscribers[0].created_at).getTime()) / 86400000)
            : 0;

        let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';

        // Forecast KPIs
        const forecastSum = forecast.reduce((s, v) => s + Math.max(0, Math.round(v)), 0);
        const last7 = dailyViews.slice(-7).reduce((s, d) => s + d.value, 0);
        html += '<div>' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">14-DAY FORECAST</div>' +
            '<div class="lb-kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:6px">' +
            '<div class="lb-kpi-card" style="padding:10px"><div class="lb-kpi-value" style="font-size:18px">' + forecastSum + '</div><div class="lb-kpi-label">Predicted Visits</div></div>' +
            '<div class="lb-kpi-card" style="padding:10px"><div class="lb-kpi-value" style="font-size:18px">' + last7 + '</div><div class="lb-kpi-label">Last 7 Days</div></div>' +
            '<div class="lb-kpi-card" style="padding:10px"><div class="lb-kpi-value" style="font-size:18px">' + Math.round(subCount + subRate * 30) + '</div><div class="lb-kpi-label">Subs in 30d</div></div>' +
            '</div></div>';

        // Content velocity
        html += '<div>' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--sub);margin-bottom:8px">CONTENT VELOCITY (views/day)</div>' +
            velocities.map((v, i) =>
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:10px">' +
                '<span style="color:var(--accent);font-weight:700;min-width:35px">' + v.velocity + '</span>' +
                '<span style="color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(v.title) + '</span>' +
                '<span style="color:var(--sub)">' + v.views + '</span></div>'
            ).join('') +
            '</div>';

        html += '</div>';
        panel.innerHTML = '<div class="lb-analytics-panel-title">PREDICTIVE ANALYTICS</div>' + html;
    }

    function _dailyAggregation(visits, days) {
        const result = [];
        const now = new Date();
        const d = days || 30;
        for (let i = d - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            const count = visits.filter(v => (v.created_at || '').slice(0, 10) === key).length;
            result.push({ label: key, value: count });
        }
        return result;
    }

    function _holtWinters(data, alpha, beta, forecastLen) {
        if (data.length < 2) return Array(forecastLen).fill(0);
        let level = data[0];
        let trend = data[1] - data[0];
        for (let i = 1; i < data.length; i++) {
            const newLevel = alpha * data[i] + (1 - alpha) * (level + trend);
            trend = beta * (newLevel - level) + (1 - beta) * trend;
            level = newLevel;
        }
        const forecast = [];
        for (let i = 1; i <= forecastLen; i++) {
            forecast.push(level + trend * i);
        }
        return forecast;
    }

    /* ═══════════════════════════════════════════════════
       INLINE ARTICLE FEED (for tabbed content hub)
       ═══════════════════════════════════════════════════ */
    var inlineArticleFeed = document.getElementById('inlineArticleFeed');
    function renderInlineArticles(articles) {
        if (!inlineArticleFeed) return;
        if (!articles || !articles.length) {
            inlineArticleFeed.innerHTML = '<div style="text-align:center;color:#6b7a90;font-size:11px;padding:16px;font-family:\'JetBrains Mono\',monospace">No articles published yet.</div>';
            return;
        }
        var show = articles.slice(0, 5);
        inlineArticleFeed.innerHTML = show.map(function(a, i) {
            var excerpt = esc((a.excerpt || '').slice(0, 140));
            if ((a.excerpt || '').length > 140) excerpt += '…';
            var tags = (a.tags || []).slice(0, 3).map(function(t) {
                return '<span class="blog-inline-tag">' + esc(t) + '</span>';
            }).join(' ');
            return '<div class="blog-inline-post" data-inline-article-slug="' + esc(a.slug) + '" style="cursor:pointer;transition-delay:' + (i * 60) + 'ms">' +
                '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#6b7a90;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">' + fmtDate(a.created_at) + ' · ' + B.readingTime(a.content || a.excerpt || '') + '</div>' +
                '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;line-height:1.3">' + esc(a.title) + '</div>' +
                (excerpt ? '<div style="font-size:12px;color:#6b7a90;line-height:1.5;margin-bottom:6px">' + excerpt + '</div>' : '') +
                (tags ? '<div style="display:flex;gap:4px;flex-wrap:wrap">' + tags + '</div>' : '') +
                '</div>';
        }).join('');
        requestAnimationFrame(function() {
            inlineArticleFeed.querySelectorAll('.blog-inline-post').forEach(function(el) { el.classList.add('visible'); });
        });
    }
    if (inlineArticleFeed) {
        inlineArticleFeed.innerHTML = [0, 1, 2].map(function() { return '<div class="blog-skeleton" style="margin-bottom:0"><div class="blog-skel-line"></div><div class="blog-skel-line"></div><div class="blog-skel-line"></div></div>'; }).join('');
        if (window._sb) {
            window._sb.from('longform_articles')
                .select('id,title,slug,excerpt,content,created_at,tags,views,series_name')
                .eq('published', true)
                .order('created_at', { ascending: false })
                .limit(5)
                .then(function(r) { renderInlineArticles(r.data || []); })
                .catch(function() { renderInlineArticles([]); });
        } else {
            renderInlineArticles([]);
        }
        inlineArticleFeed.addEventListener('click', function(e) {
            var card = e.target.closest('[data-inline-article-slug]');
            if (card) B.navigateTo({ post: card.dataset.inlineArticleSlug });
        });
    }

    // Register
    B.renderAnalyticsDashboard = renderAnalyticsDashboard;
})();
