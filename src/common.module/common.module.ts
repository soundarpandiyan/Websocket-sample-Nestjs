import { Module } from '@nestjs/common';
import { WsAdapter } from './services/websocket.adapter';

@Module({
    imports: [],
    providers: [WsAdapter]
})

export class CommonModule {
    constructor(private wsAdapter: WsAdapter) {
        wsAdapter.close();
        wsAdapter.create(3006);
    }
}
