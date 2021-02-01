/*
 * Software License Agreement (MIT License)
 *
 * Author: Duke Fong <d@d-l.io>
 */

import { escape_html, date2num, val2hex, dat2str, dat2hex, hex2dat,
         read_file, download, readable_size, blob2dat } from './utils/helper.js';
import { csa } from './ctrl.js';
import { wheelZoomPlugin, touchZoomPlugin } from './plot_zoom.js';


function make_chart(eid, name, series) {
    let opts = {
        title: name,
        width: 1200,
        height: 400,
        plugins: [
            wheelZoomPlugin({factor: 0.90}),
            touchZoomPlugin()
        ],
        cursor: {
            drag: { x: true, y: true }
        },
        scales: {
            x: {
                range(u, dataMin, dataMax) {
                    if (dataMin == null)
                        return [0, 100];
                    return [dataMin, dataMax];
                },
                time: false,
            },
            y: {
                range(u, dataMin, dataMax) {
                    if (dataMin == null)
                        return [0, 100];
                    return [dataMin, dataMax];
                    //return uPlot.rangeNum(dataMin, dataMax, 0.1, true);
                },
                //auto: false,
            }
        },
        series: series
    };

    console.log(opts, eid);
    return new uPlot(opts, null, document.getElementById(eid));
}


async function plot_set_en() {
    let msk = 0;
    for (let i = 0; i < csa.cfg_plot.fmt.length; i++) {
        if (document.getElementById(`plot${i}_en`).checked)
            msk |= 1 << i;
    }
    console.log('plot_set_en val:', msk);
    
    let dat = new Uint8Array([0x20, 0, 0, msk]);
    let dv = new DataView(dat.buffer);
    dv.setUint16(1, csa.cfg_plot.mask_addr, true);
    
    for (let i = 0; i < 3; i++) {
        await csa.proxy_sock.sendto({'dst': [csa.tgt, 0x5], 'dat': dat}, ['server', 'proxy']);
        console.log('plot_set_en wait ret');
        let ret = await csa.proxy_sock.recvfrom(500 * i);
        console.log('plot_set_en ret', ret);
        if (ret && ret[0].dat[0] == 0x80) {
            console.log('plot_set_en ok');
            break;
        } else {
            console.warn(`plot_set_en err retry${i}`);
        }
    }
}


function init_plots() {
    let list = document.getElementById('plot_list');
    list.insertAdjacentHTML('beforeend', `Plots: <br>`);
    csa.plots = [];
    csa.plots_dat = [];
    
    for (let i = 0; i < csa.cfg_plot.fmt.length; i++) {
        let f = csa.cfg_plot.fmt[i];
        let f_fmt = f.split(' - ')[0];
        let f_str = f.slice(f_fmt.length + ' - '.length);
        let series_num = f_fmt.split('.')[1].length + 1;
        let series = [];
        
        csa.plots_dat.push([]);
        for (let s = 0; s < series_num; s++) {
            let color = csa.cfg_plot.length > i ? csa.cfg_plot[i][s] : null;
            if (!color)
                color = csa.cfg_plot.color_dft[s];
            if (!color)
                color = csa.cfg_plot.color_dft[0];
            let name = f_str.split(',')[s];
            if (!name)
                name = '~';
            else
                name = name.trim();
            series.push({ label: name, stroke: color });
            csa.plots_dat[i].push([]);
        }
        
        let html = `
            <label class="checkbox"><input type="checkbox" id="plot${i}_en"> Enable Plot${i}</label><br>
            <div id="plot${i}"></div>
        `;
        
        list.insertAdjacentHTML('beforeend', html);
        document.getElementById(`plot${i}_en`).onchange = async () => await plot_set_en();
        csa.plots.push(make_chart(`plot${i}`, `Plot${i}`, series));
    }
}


export { init_plots };

